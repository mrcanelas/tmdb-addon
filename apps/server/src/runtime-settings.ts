import { z } from 'zod';
import {
  RUNTIME_SETTINGS,
  type RuntimeSettingDeclaration,
  type RuntimeSettingType,
} from '@metalayer/observability';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { RuntimeSettingsReader } from './stremio/catalog-meta.js';

const MASKED_SECRET = '********';
const VAULT_KIND = 'session';
const SECRET_SETTING_KEYS = ['REDIS_URL', 'POSTGRES_URL', 'METALAYER_TMDB_PROXY_URL'];

function vaultKey(key: string): string {
  return `runtime-setting:${key}`;
}

const DEFAULT_VALUES: Record<string, string> = {
  METALAYER_TELEMETRY_ENABLED: 'false',
  METALAYER_TRACKING_REFRESH_ENABLED: 'false',
  METALAYER_TRACKING_REFRESH_INTERVAL_MS: String(6 * 60 * 60 * 1000),
  METALAYER_CATALOG_SCAN_PAGES: '25',
  METALAYER_CATALOG_SORT_PAGES: '10',
  METALAYER_CATALOG_WINDOW_TTL_MS: '600000',
  METALAYER_RATE_LIMIT_MAX: '120',
  METALAYER_RATE_LIMIT_WINDOW_MS: '60000',
};

export type RuntimeSettingSource = 'env' | 'stored' | 'default';

export interface RuntimeSettingView {
  key: string;
  description: string;
  reload: RuntimeSettingDeclaration['reload'];
  type: RuntimeSettingType;
  editable: boolean;
  secret: boolean;
  source: RuntimeSettingSource;
  /** Display value; secrets are masked when configured. */
  value: string | number | boolean | null;
  /** True when a secret has a configured value (env or stored). */
  configured: boolean;
  restartRequired: boolean;
}

export type RuntimeSettingsStore = Pick<
  ConfigurationStore,
  | 'listInstanceSettings'
  | 'setInstanceSetting'
  | 'deleteInstanceSetting'
  | 'getInstanceSecretPlaintext'
  | 'upsertInstanceVaultSecret'
  | 'deleteInstanceVaultSecret'
>;

type Subscriber = (value: string | undefined) => void;

function declarationFor(key: string): RuntimeSettingDeclaration | undefined {
  return RUNTIME_SETTINGS.find((entry) => entry.key === key);
}

function settingType(declaration: RuntimeSettingDeclaration): RuntimeSettingType {
  return declaration.type ?? 'string';
}

function isEditable(declaration: RuntimeSettingDeclaration): boolean {
  return declaration.editable === true && declaration.reload !== 'immutable';
}

function envHasValue(env: NodeJS.ProcessEnv, key: string): boolean {
  const raw = env[key];
  return typeof raw === 'string' && raw.length > 0;
}

function coerceDisplayValue(
  type: RuntimeSettingType,
  raw: string | undefined,
): string | number | boolean | null {
  if (raw === undefined || raw === '') return null;
  if (type === 'boolean') {
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  if (type === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return raw;
}

function serializeStoredValue(type: RuntimeSettingType, value: unknown): string {
  if (type === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1' ? 'true' : 'false';
  }
  if (type === 'number') {
    return String(value);
  }
  return String(value);
}

function validateValue(type: RuntimeSettingType, value: unknown): string {
  if (type === 'boolean') {
    const parsed = z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).parse(value);
    return serializeStoredValue(type, parsed);
  }
  if (type === 'number') {
    const parsed = z.coerce.number().int().positive().max(2_147_483_647).parse(value);
    return String(parsed);
  }
  if (type === 'url') {
    const parsed = z.string().url().parse(value);
    return parsed;
  }
  return z.string().min(1).parse(value);
}

/**
 * Resolves Dashboard-managed runtime settings: stored override → env → default.
 * Hot keys notify subscribers; process-restart keys set restartRequired until process exit.
 */
export class RuntimeSettings implements RuntimeSettingsReader {
  private readonly overrides = new Map<string, string>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly restartPending = new Set<string>();

  constructor(
    private readonly store: RuntimeSettingsStore,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async load(): Promise<void> {
    const stored = await this.store.listInstanceSettings();
    this.overrides.clear();
    for (const key of SECRET_SETTING_KEYS) {
      const legacy = stored[key];
      const provider = vaultKey(key);
      let secret = await this.store.getInstanceSecretPlaintext(provider, VAULT_KIND);
      if (legacy !== undefined) {
        if (secret === null && legacy) {
          await this.store.upsertInstanceVaultSecret(provider, VAULT_KIND, legacy);
          secret = legacy;
        }
        await this.store.deleteInstanceSetting(key);
      }
      if (secret && key === 'REDIS_URL') this.overrides.set(key, secret);
      delete stored[key];
    }
    for (const [key, value] of Object.entries(stored)) {
      const declaration = declarationFor(key);
      if (declaration && isEditable(declaration) && !declaration.secret) {
        this.overrides.set(key, value);
      }
    }
  }

  /** Raw resolved string (stored → env → default). Secrets are not masked. */
  get(key: string): string | undefined {
    if (this.overrides.has(key)) return this.overrides.get(key);
    if (envHasValue(this.env, key)) return this.env[key];
    return DEFAULT_VALUES[key];
  }

  getBoolean(key: string): boolean | undefined {
    const raw = this.get(key);
    if (raw === undefined) return undefined;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    return undefined;
  }

  getNumber(key: string): number | undefined {
    const raw = this.get(key);
    if (raw === undefined || raw === '') return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  getString(key: string): string | undefined {
    return this.get(key);
  }

  sourceOf(key: string): RuntimeSettingSource {
    if (this.overrides.has(key)) return 'stored';
    if (envHasValue(this.env, key)) return 'env';
    return 'default';
  }

  list(): RuntimeSettingView[] {
    return RUNTIME_SETTINGS.map((declaration) => this.viewFor(declaration));
  }

  viewFor(declaration: RuntimeSettingDeclaration): RuntimeSettingView {
    const type = settingType(declaration);
    const source = this.sourceOf(declaration.key);
    const raw =
      source === 'stored'
        ? this.overrides.get(declaration.key)
        : source === 'env'
          ? this.env[declaration.key]
          : DEFAULT_VALUES[declaration.key];
    const configured = Boolean(raw && raw.length > 0);
    const secret = declaration.secret === true;
    const value =
      secret && configured
        ? MASKED_SECRET
        : coerceDisplayValue(type, raw);

    return {
      key: declaration.key,
      description: declaration.description,
      reload: declaration.reload,
      type,
      editable: isEditable(declaration),
      secret,
      source,
      value,
      configured,
      restartRequired: this.restartPending.has(declaration.key),
    };
  }

  async set(
    key: string,
    value: unknown,
  ): Promise<{ setting: RuntimeSettingView; restartRequired: boolean }> {
    const declaration = declarationFor(key);
    if (!declaration) {
      throw Object.assign(new Error(`Unknown runtime setting: ${key}`), {
        code: 'SETTING_NOT_FOUND',
      });
    }
    if (!isEditable(declaration)) {
      throw Object.assign(new Error(`Runtime setting ${key} is not editable`), {
        code: 'SETTING_NOT_EDITABLE',
      });
    }

    const type = settingType(declaration);
    const storedValue = validateValue(type, value);
    if (declaration.secret) {
      const url = new URL(storedValue);
      if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname) {
        throw new Error('Invalid Redis connection URL');
      }
      await this.store.upsertInstanceVaultSecret(vaultKey(key), VAULT_KIND, storedValue);
    } else {
      await this.store.setInstanceSetting(key, storedValue);
    }
    this.overrides.set(key, storedValue);

    const restartRequired = declaration.reload === 'process-restart';
    if (restartRequired) {
      this.restartPending.add(key);
    } else if (declaration.reload === 'hot') {
      this.notify(key, storedValue);
    }

    return {
      setting: this.viewFor(declaration),
      restartRequired,
    };
  }

  async clear(
    key: string,
  ): Promise<{ setting: RuntimeSettingView; restartRequired: boolean }> {
    const declaration = declarationFor(key);
    if (!declaration) {
      throw Object.assign(new Error(`Unknown runtime setting: ${key}`), {
        code: 'SETTING_NOT_FOUND',
      });
    }
    if (!isEditable(declaration)) {
      throw Object.assign(new Error(`Runtime setting ${key} is not editable`), {
        code: 'SETTING_NOT_EDITABLE',
      });
    }

    if (declaration.secret) {
      await this.store.deleteInstanceVaultSecret(vaultKey(key), VAULT_KIND);
    } else {
      await this.store.deleteInstanceSetting(key);
    }
    this.overrides.delete(key);

    const restartRequired = declaration.reload === 'process-restart';
    if (restartRequired) {
      this.restartPending.add(key);
    } else if (declaration.reload === 'hot') {
      this.notify(key, this.get(key));
    }

    return {
      setting: this.viewFor(declaration),
      restartRequired,
    };
  }

  subscribe(key: string, listener: Subscriber): () => void {
    let set = this.subscribers.get(key);
    if (!set) {
      set = new Set();
      this.subscribers.set(key, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.subscribers.delete(key);
    };
  }

  private notify(key: string, value: string | undefined): void {
    const set = this.subscribers.get(key);
    if (!set) return;
    for (const listener of set) {
      listener(value);
    }
  }
}

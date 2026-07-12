import { DatabaseSync } from 'node:sqlite';
import type { MetaLayerConfig } from '@metalayer/config';
import {
  decryptSecret,
  encryptSecret,
  generateConfigId,
  generateRevisionId,
  generateVaultEntryId,
  hashEditCredential,
  resolveEncryptionKeyRing,
  verifyEditCredential,
  type EncryptionKeyRing,
} from '@metalayer/security';

export type SecretKind = 'api_key' | 'oauth_access' | 'oauth_refresh' | 'session';

export type SecretCredentialState =
  | 'connected'
  | 'not_configured'
  | 'expired'
  | 'invalid';

export interface StoredConfiguration {
  configId: string;
  config: MetaLayerConfig;
  createdAt: string;
  updatedAt: string;
}

export interface PublicConfigurationView {
  configId: string;
  config: MetaLayerConfig;
  secrets: Record<string, SecretCredentialState>;
  manifestPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurationRevisionSummary {
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  note?: string;
}

export interface ConfigurationRevision extends ConfigurationRevisionSummary {
  config: MetaLayerConfig;
}

export interface SafeConfigurationExport {
  format: 'metalayer-config-export';
  formatVersion: 1;
  exportedAt: string;
  configId: string;
  config: MetaLayerConfig;
  secrets: Record<string, SecretCredentialState>;
  includesSecrets: false;
}

export interface CreateConfigurationInput {
  config: MetaLayerConfig;
  editCredential: string;
  secrets?: Record<string, string>;
}

export interface UpdateConfigurationInput {
  config: MetaLayerConfig;
  note?: string;
  /** Optional new/updated plaintext secrets to vault. */
  secrets?: Record<string, string>;
}

export interface VaultSecretRow {
  id: string;
  configId: string;
  provider: string;
  kind: SecretKind;
  ciphertext: string;
  keyVersion: number;
}

export interface VaultReencryptResult {
  total: number;
  reencrypted: number;
  alreadyCurrent: number;
  failed: Array<{ id: string; error: string }>;
  activeVersion: number;
  dryRun: boolean;
}

export interface ConfigurationStore {
  create(input: CreateConfigurationInput): Promise<PublicConfigurationView>;
  update(
    configId: string,
    input: UpdateConfigurationInput,
  ): Promise<PublicConfigurationView | null>;
  getPublic(configId: string): Promise<PublicConfigurationView | null>;
  listConfigIds(): Promise<string[]>;
  verifyEditAccess(configId: string, editCredential: string): Promise<boolean>;
  getSecretPlaintext(
    configId: string,
    provider: string,
    kind?: SecretKind,
  ): Promise<string | null>;
  upsertVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
    plaintext: string,
  ): Promise<boolean>;
  deleteVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
  ): Promise<boolean>;
  listSecretStates(configId: string): Promise<Record<string, SecretCredentialState>>;
  listVaultSecretRows(): Promise<VaultSecretRow[]>;
  reencryptVaultSecrets(options?: {
    dryRun?: boolean;
  }): Promise<VaultReencryptResult>;
  listRevisions(configId: string): Promise<ConfigurationRevisionSummary[]>;
  getRevision(
    configId: string,
    revisionId: string,
  ): Promise<ConfigurationRevision | null>;
  restoreRevision(
    configId: string,
    revisionId: string,
    note?: string,
  ): Promise<PublicConfigurationView | null>;
  exportSafe(configId: string): Promise<SafeConfigurationExport | null>;
  close(): Promise<void>;
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS configurations (
      config_id TEXT PRIMARY KEY NOT NULL,
      edit_credential_hash TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_secrets (
      id TEXT PRIMARY KEY NOT NULL,
      config_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      kind TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      key_version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(config_id, provider, kind),
      FOREIGN KEY(config_id) REFERENCES configurations(config_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS configuration_revisions (
      revision_id TEXT PRIMARY KEY NOT NULL,
      config_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      note TEXT,
      UNIQUE(config_id, revision_number),
      FOREIGN KEY(config_id) REFERENCES configurations(config_id) ON DELETE CASCADE
    );
  `);
}

/**
 * Lite persistence using Node's built-in SQLite (no native addon compile step).
 * ADR 0005 — suitable for MetaLayer Lite; Server mode may switch to Postgres later.
 */
export class SqliteConfigurationStore implements ConfigurationStore {
  private readonly db: DatabaseSync;
  private readonly keyRing: EncryptionKeyRing;

  constructor(options: {
    sqlitePath: string;
    encryptionKey: string | EncryptionKeyRing;
  }) {
    this.keyRing = resolveEncryptionKeyRing(options.encryptionKey);
    this.db = new DatabaseSync(options.sqlitePath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    ensureSchema(this.db);
  }

  private nextRevisionNumber(configId: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(revision_number), 0) AS max_rev
         FROM configuration_revisions WHERE config_id = ?`,
      )
      .get(configId) as { max_rev: number };
    return Number(row.max_rev) + 1;
  }

  private insertRevision(
    configId: string,
    config: MetaLayerConfig,
    createdAt: string,
    note?: string,
  ): void {
    const revisionNumber = this.nextRevisionNumber(configId);
    this.db
      .prepare(
        `INSERT INTO configuration_revisions
         (revision_id, config_id, revision_number, config_json, created_at, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        generateRevisionId(),
        configId,
        revisionNumber,
        JSON.stringify(config),
        createdAt,
        note ?? null,
      );
  }

  private upsertSecrets(
    configId: string,
    secrets: Record<string, string> | undefined,
    now: string,
  ): void {
    if (!secrets) return;
    const insertSecret = this.db.prepare(`
      INSERT INTO vault_secrets (id, config_id, provider, kind, ciphertext, key_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(config_id, provider, kind) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        key_version = excluded.key_version,
        updated_at = excluded.updated_at
    `);

    for (const [provider, plaintext] of Object.entries(secrets)) {
      if (!plaintext) continue;
      const envelope = encryptSecret(plaintext, this.keyRing);
      insertSecret.run(
        generateVaultEntryId(),
        configId,
        provider,
        'api_key',
        envelope,
        this.keyRing.activeVersion,
        now,
        now,
      );
    }
  }

  async create(input: CreateConfigurationInput): Promise<PublicConfigurationView> {
    const configId = generateConfigId();
    const now = new Date().toISOString();
    const editHash = hashEditCredential(input.editCredential);
    const config: MetaLayerConfig = {
      ...input.config,
      updatedAt: now,
      createdAt: input.config.createdAt || now,
    };

    const insertConfig = this.db.prepare(`
      INSERT INTO configurations (config_id, edit_credential_hash, config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.db.exec('BEGIN');
    try {
      insertConfig.run(configId, editHash, JSON.stringify(config), now, now);
      this.upsertSecrets(configId, input.secrets, now);
      this.insertRevision(configId, config, now, 'initial');
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return (await this.getPublic(configId))!;
  }

  async update(
    configId: string,
    input: UpdateConfigurationInput,
  ): Promise<PublicConfigurationView | null> {
    const existing = await this.getPublic(configId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const config: MetaLayerConfig = {
      ...input.config,
      createdAt: existing.config.createdAt,
      updatedAt: now,
    };

    this.db.exec('BEGIN');
    try {
      const result = this.db
        .prepare(
          `UPDATE configurations
           SET config_json = ?, updated_at = ?
           WHERE config_id = ?`,
        )
        .run(JSON.stringify(config), now, configId);
      if (result.changes === 0) {
        this.db.exec('ROLLBACK');
        return null;
      }
      this.upsertSecrets(configId, input.secrets, now);
      this.insertRevision(configId, config, now, input.note);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return this.getPublic(configId);
  }

  async getPublic(configId: string): Promise<PublicConfigurationView | null> {
    const row = this.db
      .prepare(
        `SELECT config_id, config_json, created_at, updated_at
         FROM configurations WHERE config_id = ?`,
      )
      .get(configId) as
      | { config_id: string; config_json: string; created_at: string; updated_at: string }
      | undefined;

    if (!row) return null;

    return {
      configId: row.config_id,
      config: JSON.parse(row.config_json) as MetaLayerConfig,
      secrets: await this.listSecretStates(configId),
      manifestPath: `/c/${row.config_id}/manifest.json`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listConfigIds(): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT config_id FROM configurations ORDER BY created_at ASC`)
      .all() as Array<{ config_id: string }>;
    return rows.map((row) => row.config_id);
  }

  async verifyEditAccess(configId: string, editCredential: string): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT edit_credential_hash FROM configurations WHERE config_id = ?`)
      .get(configId) as { edit_credential_hash: string } | undefined;
    if (!row) return false;
    return verifyEditCredential(editCredential, row.edit_credential_hash);
  }

  async getSecretPlaintext(
    configId: string,
    provider: string,
    kind: SecretKind = 'api_key',
  ): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT ciphertext FROM vault_secrets
         WHERE config_id = ? AND provider = ? AND kind = ?`,
      )
      .get(configId, provider, kind) as { ciphertext: string } | undefined;
    if (!row) {
      // Legacy import stored refresh as provider `trakt_refresh` with api_key kind.
      if (kind === 'oauth_refresh') {
        return this.getSecretPlaintext(configId, `${provider}_refresh`, 'api_key');
      }
      if (kind === 'oauth_access') {
        return this.getSecretPlaintext(configId, provider, 'api_key');
      }
      return null;
    }
    return decryptSecret(row.ciphertext, this.keyRing);
  }

  async upsertVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
    plaintext: string,
  ): Promise<boolean> {
    if (!plaintext) return false;
    const existing = await this.getPublic(configId);
    if (!existing) return false;
    const now = new Date().toISOString();
    const envelope = encryptSecret(plaintext, this.keyRing);
    this.db
      .prepare(
        `
      INSERT INTO vault_secrets (id, config_id, provider, kind, ciphertext, key_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(config_id, provider, kind) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        key_version = excluded.key_version,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        generateVaultEntryId(),
        configId,
        provider,
        kind,
        envelope,
        this.keyRing.activeVersion,
        now,
        now,
      );
    return true;
  }

  async deleteVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
  ): Promise<boolean> {
    const result = this.db
      .prepare(
        `DELETE FROM vault_secrets WHERE config_id = ? AND provider = ? AND kind = ?`,
      )
      .run(configId, provider, kind);
    return Number(result.changes ?? 0) > 0;
  }

  async listSecretStates(
    configId: string,
  ): Promise<Record<string, SecretCredentialState>> {
    const rows = this.db
      .prepare(`SELECT provider FROM vault_secrets WHERE config_id = ?`)
      .all(configId) as Array<{ provider: string }>;
    const states: Record<string, SecretCredentialState> = {};
    for (const row of rows) {
      states[row.provider] = 'connected';
    }
    return states;
  }

  async listVaultSecretRows(): Promise<VaultSecretRow[]> {
    const rows = this.db
      .prepare(
        `SELECT id, config_id, provider, kind, ciphertext, key_version
         FROM vault_secrets
         ORDER BY config_id, provider, kind`,
      )
      .all() as Array<{
      id: string;
      config_id: string;
      provider: string;
      kind: string;
      ciphertext: string;
      key_version: number;
    }>;
    return rows.map((row) => ({
      id: row.id,
      configId: row.config_id,
      provider: row.provider,
      kind: row.kind as SecretKind,
      ciphertext: row.ciphertext,
      keyVersion: Number(row.key_version),
    }));
  }

  async reencryptVaultSecrets(options: {
    dryRun?: boolean;
  } = {}): Promise<VaultReencryptResult> {
    const dryRun = options.dryRun === true;
    const rows = await this.listVaultSecretRows();
    const result: VaultReencryptResult = {
      total: rows.length,
      reencrypted: 0,
      alreadyCurrent: 0,
      failed: [],
      activeVersion: this.keyRing.activeVersion,
      dryRun,
    };

    const update = this.db.prepare(
      `UPDATE vault_secrets
       SET ciphertext = ?, key_version = ?, updated_at = ?
       WHERE id = ?`,
    );

    for (const row of rows) {
      if (row.keyVersion === this.keyRing.activeVersion) {
        result.alreadyCurrent += 1;
        continue;
      }
      try {
        const plaintext = decryptSecret(row.ciphertext, this.keyRing);
        const envelope = encryptSecret(plaintext, this.keyRing);
        if (!dryRun) {
          update.run(
            envelope,
            this.keyRing.activeVersion,
            new Date().toISOString(),
            row.id,
          );
        }
        result.reencrypted += 1;
      } catch (error) {
        result.failed.push({
          id: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  async listRevisions(configId: string): Promise<ConfigurationRevisionSummary[]> {
    const rows = this.db
      .prepare(
        `SELECT revision_id, revision_number, created_at, note
         FROM configuration_revisions
         WHERE config_id = ?
         ORDER BY revision_number DESC`,
      )
      .all(configId) as Array<{
      revision_id: string;
      revision_number: number;
      created_at: string;
      note: string | null;
    }>;

    return rows.map((row) => ({
      revisionId: row.revision_id,
      revisionNumber: row.revision_number,
      createdAt: row.created_at,
      note: row.note ?? undefined,
    }));
  }

  async getRevision(
    configId: string,
    revisionId: string,
  ): Promise<ConfigurationRevision | null> {
    const row = this.db
      .prepare(
        `SELECT revision_id, revision_number, config_json, created_at, note
         FROM configuration_revisions
         WHERE config_id = ? AND revision_id = ?`,
      )
      .get(configId, revisionId) as
      | {
          revision_id: string;
          revision_number: number;
          config_json: string;
          created_at: string;
          note: string | null;
        }
      | undefined;

    if (!row) return null;
    return {
      revisionId: row.revision_id,
      revisionNumber: row.revision_number,
      createdAt: row.created_at,
      note: row.note ?? undefined,
      config: JSON.parse(row.config_json) as MetaLayerConfig,
    };
  }

  async restoreRevision(
    configId: string,
    revisionId: string,
    note?: string,
  ): Promise<PublicConfigurationView | null> {
    const revision = await this.getRevision(configId, revisionId);
    if (!revision) return null;
    return this.update(configId, {
      config: revision.config,
      note: note ?? `restored from revision ${revision.revisionNumber}`,
    });
  }

  async exportSafe(configId: string): Promise<SafeConfigurationExport | null> {
    const view = await this.getPublic(configId);
    if (!view) return null;
    return {
      format: 'metalayer-config-export',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      configId: view.configId,
      config: view.config,
      secrets: view.secrets,
      includesSecrets: false,
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/** In-memory SQLite for tests. */
export function createMemoryConfigurationStore(
  encryptionKey: string | EncryptionKeyRing,
): SqliteConfigurationStore {
  return new SqliteConfigurationStore({
    sqlitePath: ':memory:',
    encryptionKey,
  });
}

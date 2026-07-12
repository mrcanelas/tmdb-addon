import type { ConfigurationStore } from '@metalayer/persistence';
import {
  refreshMalAccessToken,
  refreshTraktAccessToken,
  type TmdbFetch,
} from '@metalayer/providers';
import type { TrackingProviderId } from '@metalayer/tracking';

export const REFRESHABLE_TRACKING_PROVIDERS = new Set<TrackingProviderId>([
  'trakt',
  'mal',
]);

export interface TrackingOAuthMeta {
  accessExpiresAt?: string;
}

export interface TrackingRefreshTarget {
  configId: string;
  provider: TrackingProviderId;
}

export interface ProactiveTrackingRefreshResult {
  scanned: number;
  refreshed: number;
  skipped: number;
  failed: Array<{ configId: string; provider: string; error: string }>;
  dryRun: boolean;
}

const DEFAULT_REFRESH_BUFFER_MS = 60 * 60 * 1000;

export function computeAccessExpiresAt(
  expiresIn?: number,
  now = Date.now(),
): string | undefined {
  if (!expiresIn || expiresIn <= 0) return undefined;
  return new Date(now + expiresIn * 1000).toISOString();
}

export function parseTrackingOAuthMeta(raw: string | null): TrackingOAuthMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TrackingOAuthMeta;
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function readTrackingOAuthMeta(
  store: ConfigurationStore,
  configId: string,
  provider: TrackingProviderId,
): Promise<TrackingOAuthMeta | null> {
  const raw = await store.getSecretPlaintext(configId, provider, 'session');
  return parseTrackingOAuthMeta(raw);
}

export async function writeTrackingOAuthMeta(
  store: ConfigurationStore,
  configId: string,
  provider: TrackingProviderId,
  meta: TrackingOAuthMeta,
): Promise<void> {
  await store.upsertVaultSecret(
    configId,
    provider,
    'session',
    JSON.stringify(meta),
  );
}

export function shouldProactiveRefresh(
  input: {
    hasAccess: boolean;
    hasRefresh: boolean;
    meta: TrackingOAuthMeta | null;
    now?: number;
    bufferMs?: number;
  },
): boolean {
  if (!input.hasRefresh) return false;
  if (!input.hasAccess) return true;

  const expiresAt = input.meta?.accessExpiresAt;
  if (!expiresAt) return false;

  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires)) return false;

  const now = input.now ?? Date.now();
  const bufferMs = input.bufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
  return expires - now <= bufferMs;
}

export async function listRefreshableTrackingTargets(
  store: ConfigurationStore,
): Promise<TrackingRefreshTarget[]> {
  const rows = await store.listVaultSecretRows();
  const seen = new Set<string>();
  const targets: TrackingRefreshTarget[] = [];

  for (const row of rows) {
    if (row.kind !== 'oauth_refresh') continue;
    if (!REFRESHABLE_TRACKING_PROVIDERS.has(row.provider as TrackingProviderId)) {
      continue;
    }
    const key = `${row.configId}:${row.provider}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      configId: row.configId,
      provider: row.provider as TrackingProviderId,
    });
  }

  return targets;
}

export async function tryRefreshTrackingToken(input: {
  store: ConfigurationStore;
  configId: string;
  provider: TrackingProviderId;
  fetchImpl?: TmdbFetch;
}): Promise<{ accessToken: string; expiresIn?: number } | null> {
  if (!REFRESHABLE_TRACKING_PROVIDERS.has(input.provider)) return null;

  const fetchImpl = input.fetchImpl ?? fetch;
  const refreshToken = await input.store.getSecretPlaintext(
    input.configId,
    input.provider,
    'oauth_refresh',
  );
  if (!refreshToken) return null;

  if (input.provider === 'trakt') {
    const clientId = process.env.TRAKT_CLIENT_ID;
    const clientSecret = process.env.TRAKT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    const tokens = await refreshTraktAccessToken({
      refreshToken,
      clientId,
      clientSecret,
      fetchImpl,
    });
    await input.store.upsertVaultSecret(
      input.configId,
      'trakt',
      'oauth_access',
      tokens.accessToken,
    );
    if (tokens.refreshToken) {
      await input.store.upsertVaultSecret(
        input.configId,
        'trakt',
        'oauth_refresh',
        tokens.refreshToken,
      );
    }
    const expiresAt = computeAccessExpiresAt(tokens.expiresIn);
    if (expiresAt) {
      await writeTrackingOAuthMeta(input.store, input.configId, 'trakt', {
        accessExpiresAt: expiresAt,
      });
    }
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  if (input.provider === 'mal') {
    const clientId = process.env.MAL_CLIENT_ID;
    const clientSecret = process.env.MAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    const tokens = await refreshMalAccessToken({
      refreshToken,
      clientId,
      clientSecret,
      fetchImpl,
    });
    await input.store.upsertVaultSecret(
      input.configId,
      'mal',
      'oauth_access',
      tokens.accessToken,
    );
    if (tokens.refreshToken) {
      await input.store.upsertVaultSecret(
        input.configId,
        'mal',
        'oauth_refresh',
        tokens.refreshToken,
      );
    }
    const expiresAt = computeAccessExpiresAt(tokens.expiresIn);
    if (expiresAt) {
      await writeTrackingOAuthMeta(input.store, input.configId, 'mal', {
        accessExpiresAt: expiresAt,
      });
    }
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  return null;
}

export async function persistTrackingOAuthMetadata(
  store: ConfigurationStore,
  configId: string,
  provider: TrackingProviderId,
  expiresIn?: number,
): Promise<void> {
  if (!REFRESHABLE_TRACKING_PROVIDERS.has(provider)) return;
  const accessExpiresAt = computeAccessExpiresAt(expiresIn);
  if (!accessExpiresAt) return;
  await writeTrackingOAuthMeta(store, configId, provider, { accessExpiresAt });
}

export async function clearTrackingAccessTokens(
  store: ConfigurationStore,
  configId: string,
  provider: TrackingProviderId,
  options?: { keepRefresh?: boolean },
): Promise<void> {
  await store.deleteVaultSecret(configId, provider, 'oauth_access');
  await store.deleteVaultSecret(configId, provider, 'api_key');
  if (!options?.keepRefresh) {
    await store.deleteVaultSecret(configId, provider, 'oauth_refresh');
    await store.deleteVaultSecret(configId, provider, 'session');
  }
}

export async function runProactiveTrackingRefresh(input: {
  store: ConfigurationStore;
  fetchImpl?: TmdbFetch;
  dryRun?: boolean;
  bufferMs?: number;
}): Promise<ProactiveTrackingRefreshResult> {
  const dryRun = input.dryRun === true;
  const targets = await listRefreshableTrackingTargets(input.store);
  const result: ProactiveTrackingRefreshResult = {
    scanned: targets.length,
    refreshed: 0,
    skipped: 0,
    failed: [],
    dryRun,
  };

  for (const target of targets) {
    const [access, refresh, meta] = await Promise.all([
      input.store.getSecretPlaintext(
        target.configId,
        target.provider,
        'oauth_access',
      ),
      input.store.getSecretPlaintext(
        target.configId,
        target.provider,
        'oauth_refresh',
      ),
      readTrackingOAuthMeta(input.store, target.configId, target.provider),
    ]);

    const eligible = shouldProactiveRefresh({
      hasAccess: Boolean(access),
      hasRefresh: Boolean(refresh),
      meta,
      bufferMs: input.bufferMs,
    });
    if (!eligible) {
      result.skipped += 1;
      continue;
    }

    if (dryRun) {
      result.refreshed += 1;
      continue;
    }

    try {
      const refreshed = await tryRefreshTrackingToken({
        store: input.store,
        configId: target.configId,
        provider: target.provider,
        fetchImpl: input.fetchImpl,
      });
      if (!refreshed) {
        await clearTrackingAccessTokens(input.store, target.configId, target.provider, {
          keepRefresh: true,
        });
        result.failed.push({
          configId: target.configId,
          provider: target.provider,
          error: 'refresh returned no tokens',
        });
        continue;
      }
      result.refreshed += 1;
    } catch (error) {
      await clearTrackingAccessTokens(input.store, target.configId, target.provider, {
        keepRefresh: true,
      });
      result.failed.push({
        configId: target.configId,
        provider: target.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export function parseTrackingRefreshIntervalMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.METALAYER_TRACKING_REFRESH_INTERVAL_MS?.trim();
  if (!raw) return 6 * 60 * 60 * 1000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    return 6 * 60 * 60 * 1000;
  }
  return parsed;
}

export function isTrackingRefreshEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.METALAYER_TRACKING_REFRESH_ENABLED?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

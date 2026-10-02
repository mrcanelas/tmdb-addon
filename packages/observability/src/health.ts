import type {
  DeploymentMode,
  HealthSnapshot,
  RuntimeSettingDeclaration,
} from './types.js';
import type { MetricsRegistry } from './metrics.js';

export function resolveDeploymentMode(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentMode {
  const explicit = env.METALAYER_DEPLOYMENT_MODE?.toLowerCase();
  if (explicit === 'server') return 'server';
  if (explicit === 'lite') return 'lite';
  if (env.POSTGRES_URL || env.REDIS_URL) return 'server';
  return 'lite';
}

export function buildHealthSnapshot(input: {
  metrics: MetricsRegistry;
  version: string;
  startedAt: Date;
  activeConfigurations?: number;
  env?: NodeJS.ProcessEnv;
}): HealthSnapshot {
  const env = input.env ?? process.env;
  const mode = resolveDeploymentMode(env);
  const metrics = input.metrics.snapshot();
  const uptimeSeconds = Math.max(
    0,
    Math.floor((Date.now() - input.startedAt.getTime()) / 1000),
  );

  const degraded =
    metrics.errorsTotal > 0 &&
    metrics.requestsTotal > 0 &&
    metrics.errorsTotal / metrics.requestsTotal > 0.25;

  return {
    status: degraded ? 'degraded' : 'ok',
    mode,
    version: input.version,
    uptimeSeconds,
    metrics,
    database: {
      kind: env.POSTGRES_URL ? 'postgres' : env.METALAYER_SQLITE_PATH ? 'sqlite' : 'unknown',
      pathConfigured: Boolean(env.METALAYER_SQLITE_PATH || env.POSTGRES_URL),
    },
    cache: {
      kind: env.REDIS_URL ? 'redis' : 'memory',
      redisConfigured: Boolean(env.REDIS_URL),
    },
    telemetryEnabled: env.METALAYER_TELEMETRY_ENABLED === 'true',
    queueDepth: Number(env.METALAYER_QUEUE_DEPTH ?? 0) || 0,
    activeConfigurations: input.activeConfigurations,
  };
}

export const RUNTIME_SETTINGS: RuntimeSettingDeclaration[] = [
  {
    key: 'METALAYER_TELEMETRY_ENABLED',
    description: 'Anonymous telemetry toggle (default false)',
    reload: 'hot',
    type: 'boolean',
    editable: true,
  },
  {
    key: 'METALAYER_TRACKING_REFRESH_ENABLED',
    description: 'Proactive OAuth tracking token refresh scheduler',
    reload: 'hot',
    type: 'boolean',
    editable: true,
  },
  {
    key: 'METALAYER_TRACKING_REFRESH_INTERVAL_MS',
    description: 'Tracking token refresh interval in milliseconds (min 60000)',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_CATALOG_SCAN_PAGES',
    description: 'Max source pages scanned per catalog request',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_CATALOG_SORT_PAGES',
    description: 'Source pages gathered before applying a sorting plan',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_CACHE_TTL_MANIFEST_MS',
    description: 'Manifest response cache TTL in milliseconds',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_CACHE_TTL_CATALOG_MS',
    description: 'Catalog response cache TTL in milliseconds',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_CACHE_TTL_META_MS',
    description: 'Meta response cache TTL in milliseconds',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_TMDB_PROXY_URL',
    description: 'Optional TMDB HTTP proxy URL (may include credentials)',
    reload: 'process-restart',
    type: 'url',
    editable: true,
    secret: true,
  },
  {
    key: 'METALAYER_RATE_LIMIT_MAX',
    description: 'Max requests per rate-limit window',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'METALAYER_RATE_LIMIT_WINDOW_MS',
    description: 'Rate-limit window duration in milliseconds',
    reload: 'hot',
    type: 'number',
    editable: true,
  },
  {
    key: 'REDIS_URL',
    description: 'Shared Redis cache for Server mode',
    reload: 'process-restart',
    type: 'url',
    editable: true,
    secret: true,
  },
  {
    key: 'POSTGRES_URL',
    description: 'PostgreSQL for Server mode',
    reload: 'process-restart',
    type: 'url',
    editable: true,
    secret: true,
  },
  {
    key: 'METALAYER_DEPLOYMENT_MODE',
    description: 'lite | server deployment profile',
    reload: 'immutable',
    type: 'string',
    editable: false,
  },
  {
    key: 'METALAYER_ENCRYPTION_KEY',
    description: 'Secret Vault encryption key',
    reload: 'immutable',
    type: 'string',
    editable: false,
    secret: true,
  },
  {
    key: 'METALAYER_SQLITE_PATH',
    description: 'SQLite path for Lite persistence',
    reload: 'immutable',
    type: 'string',
    editable: false,
  },
  {
    key: 'METALAYER_DASHBOARD_TOKEN',
    description: 'Operator dashboard bearer token',
    reload: 'immutable',
    type: 'string',
    editable: false,
    secret: true,
  },
];

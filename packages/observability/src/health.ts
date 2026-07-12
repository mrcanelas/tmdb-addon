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
  },
  {
    key: 'METALAYER_DEPLOYMENT_MODE',
    description: 'lite | server deployment profile',
    reload: 'process-restart',
  },
  {
    key: 'METALAYER_ENCRYPTION_KEY',
    description: 'Secret Vault encryption key',
    reload: 'immutable',
  },
  {
    key: 'METALAYER_SQLITE_PATH',
    description: 'SQLite path for Lite persistence',
    reload: 'process-restart',
  },
  {
    key: 'REDIS_URL',
    description: 'Shared Redis cache for Server mode',
    reload: 'process-restart',
  },
  {
    key: 'POSTGRES_URL',
    description: 'PostgreSQL for Server mode',
    reload: 'process-restart',
  },
  {
    key: 'METALAYER_DASHBOARD_TOKEN',
    description: 'Operator dashboard bearer token',
    reload: 'hot',
  },
];

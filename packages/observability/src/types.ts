export type DeploymentMode = 'lite' | 'server';

export interface MetricCounters {
  requestsTotal: number;
  errorsTotal: number;
  configReads: number;
  configWrites: number;
  providerFailures: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface LatencyBucket {
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: string;
  at: string;
  /** Already redacted structured context. */
  context?: Record<string, unknown>;
}

export interface HealthSnapshot {
  status: 'ok' | 'degraded';
  mode: DeploymentMode;
  version: string;
  uptimeSeconds: number;
  metrics: MetricCounters & {
    requestLatencyMs: {
      avg: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
      samples: number;
    };
    cacheHitRate: number | null;
  };
  database: {
    kind: 'sqlite' | 'postgres' | 'unknown';
    pathConfigured: boolean;
  };
  cache: {
    kind: 'memory' | 'redis';
    redisConfigured: boolean;
  };
  telemetryEnabled: boolean;
  queueDepth: number;
  activeConfigurations?: number;
}

export type RuntimeSettingType = 'boolean' | 'string' | 'number' | 'url';

export interface RuntimeSettingDeclaration {
  key: string;
  description: string;
  reload: 'hot' | 'worker-restart' | 'process-restart' | 'immutable';
  /** Value type for validation and Dashboard editors. Defaults to string when omitted. */
  type?: RuntimeSettingType;
  /** When false or omitted for bootstrap keys, Dashboard cannot mutate the value. */
  editable?: boolean;
  /** When true, API responses mask the value and UI uses replace-only input. */
  secret?: boolean;
}

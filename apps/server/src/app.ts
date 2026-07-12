import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApiError } from '@metalayer/api-errors';
import {
  CorrectionRegistry,
  loadSampleCommunityCorrections,
} from '@metalayer/corrections';
import {
  BoundedLogBuffer,
  MetricsRegistry,
} from '@metalayer/observability';
import {
  createMemoryConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import type { TmdbFetch } from '@metalayer/providers';
import { MemoryCache } from '@metalayer/cache';
import { FASTIFY_LOG_REDACT_PATHS, redactSensitive } from '@metalayer/security';
import { correlationPlugin } from './plugins/correlation.js';
import { corsPlugin } from './plugins/cors.js';
import { apiV1Routes } from './routes/api-v1.js';
import { nativeManifestRoutes } from './routes/native-manifest.js';

export interface BuildAppOptions {
  logger?: boolean;
  store?: ConfigurationStore;
  encryptionKey?: string;
  sqlitePath?: string;
  /** Injectable HTTP for provider adapters (tests / offline). */
  providerFetch?: TmdbFetch;
  providerCache?: MemoryCache;
  correctionRegistry?: CorrectionRegistry;
  metrics?: MetricsRegistry;
  logBuffer?: BoundedLogBuffer;
  /** Override for dashboard auth tests. */
  env?: NodeJS.ProcessEnv;
}

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerCache: MemoryCache;
    correctionRegistry: CorrectionRegistry;
    metrics: MetricsRegistry;
    logBuffer: BoundedLogBuffer;
    startedAt: Date;
  }
}

function resolveStore(options: BuildAppOptions): ConfigurationStore {
  if (options.store) return options.store;

  const encryptionKey =
    options.encryptionKey ?? process.env.METALAYER_ENCRYPTION_KEY ?? '';
  const sqlitePath = options.sqlitePath ?? process.env.METALAYER_SQLITE_PATH ?? '';

  if (!encryptionKey) {
    throw new Error('METALAYER_ENCRYPTION_KEY is required to start MetaLayer API');
  }

  if (!sqlitePath || sqlitePath === ':memory:') {
    return createMemoryConfigurationStore(encryptionKey);
  }

  mkdirSync(dirname(sqlitePath), { recursive: true });
  return new SqliteConfigurationStore({ sqlitePath, encryptionKey });
}

function buildLoggerOption(enabled: boolean) {
  if (!enabled) return false;

  return {
    redact: {
      paths: [...FASTIFY_LOG_REDACT_PATHS],
      censor: '[REDACTED]',
    },
  } as NonNullable<Parameters<typeof Fastify>[0]>['logger'];
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: buildLoggerOption(options.logger ?? true),
  });

  const store = resolveStore(options);
  const correctionRegistry =
    options.correctionRegistry ??
    (() => {
      const registry = new CorrectionRegistry();
      registry.loadCommunity(loadSampleCommunityCorrections());
      return registry;
    })();
  const metrics = options.metrics ?? new MetricsRegistry();
  const logBuffer = options.logBuffer ?? new BoundedLogBuffer();

  app.decorate('configStore', store);
  app.decorate('providerFetch', options.providerFetch);
  app.decorate('providerCache', options.providerCache ?? new MemoryCache());
  app.decorate('correctionRegistry', correctionRegistry);
  app.decorate('metrics', metrics);
  app.decorate('logBuffer', logBuffer);
  app.decorate('startedAt', new Date());

  app.addHook('onRequest', async (request) => {
    (request as { _startedAtMs?: number })._startedAtMs = Date.now();
    metrics.increment('requestsTotal');
  });

  app.addHook('onResponse', async (request, reply) => {
    const started = (request as { _startedAtMs?: number })._startedAtMs;
    if (typeof started === 'number') {
      metrics.recordLatency(Date.now() - started);
    }
    if (reply.statusCode >= 500) {
      metrics.increment('errorsTotal');
      logBuffer.append({
        level: 'error',
        message: `${request.method} ${request.url} → ${reply.statusCode}`,
        correlationId: request.correlationId,
      });
    }
  });

  app.addHook('onClose', async () => {
    store.close();
  });

  await app.register(corsPlugin);
  await app.register(correlationPlugin);
  await app.register(apiV1Routes, { prefix: '/api/v1' });
  await app.register(nativeManifestRoutes);

  app.setNotFoundHandler((request, reply) => {
    const error = createApiError({
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${request.method} ${request.url}`,
      correlationId: request.correlationId,
      params: {
        method: request.method,
        path: request.url,
      },
    });
    return reply.status(404).send(error);
  });

  app.setErrorHandler((err, request, reply) => {
    request.log.error(redactSensitive(err));
    metrics.increment('errorsTotal');
    logBuffer.append({
      level: 'error',
      message: 'Unhandled error',
      correlationId: request.correlationId,
      context: { name: err instanceof Error ? err.name : 'unknown' },
    });
    const error = createApiError({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
      correlationId: request.correlationId ?? 'unknown',
    });
    return reply.status(500).send(error);
  });

  return app;
}

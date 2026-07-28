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
  PostgresConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import {
  ProviderHealthRegistry,
  type TmdbFetch,
} from '@metalayer/providers';
import {
  MemoryCache,
  RedisCache,
  type CacheStore,
} from '@metalayer/cache';
import {
  FASTIFY_LOG_REDACT_PATHS,
  parseEncryptionKeyRingFromEnv,
  redactSensitive,
  resolveEncryptionKeyRing,
  type EncryptionKeyRing,
} from '@metalayer/security';
import { correlationPlugin } from './plugins/correlation.js';
import { corsPlugin } from './plugins/cors.js';
import { spaStaticPlugin } from './plugins/spa-static.js';
import { apiV1Routes } from './routes/api-v1.js';
import { nativeManifestRoutes } from './routes/native-manifest.js';
import { nativeStremioRoutes } from './routes/native-stremio.js';
import { legacyStremioRoutes } from './routes/legacy-stremio.js';

export interface BuildAppOptions {
  logger?: boolean;
  store?: ConfigurationStore;
  encryptionKey?: string;
  /** Multi-version key ring; wins over encryptionKey / env when set. */
  encryptionKeyRing?: EncryptionKeyRing;
  sqlitePath?: string;
  /** Injectable HTTP for provider adapters (tests / offline). */
  providerFetch?: TmdbFetch;
  /** Shared provider circuit-breaker registry (tests / process default). */
  providerHealth?: ProviderHealthRegistry;
  providerCache?: CacheStore;
  correctionRegistry?: CorrectionRegistry;
  metrics?: MetricsRegistry;
  logBuffer?: BoundedLogBuffer;
  /** Override for dashboard auth tests. */
  env?: NodeJS.ProcessEnv;
  /** Absolute path to configure SPA dist (tests / Docker). */
  configureDist?: string;
  /** Absolute path to admin SPA dist (tests / Docker). */
  adminDist?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
    correctionRegistry: CorrectionRegistry;
    metrics: MetricsRegistry;
    logBuffer: BoundedLogBuffer;
    startedAt: Date;
  }
}

async function resolveStore(options: BuildAppOptions): Promise<ConfigurationStore> {
  if (options.store) return options.store;

  const env = options.env ?? process.env;
  const encryptionKeyRing =
    options.encryptionKeyRing ??
    (options.encryptionKey
      ? resolveEncryptionKeyRing(options.encryptionKey)
      : env.METALAYER_ENCRYPTION_KEY
        ? parseEncryptionKeyRingFromEnv(env)
        : null);
  const sqlitePath = options.sqlitePath ?? env.METALAYER_SQLITE_PATH ?? '';
  const postgresUrl = env.POSTGRES_URL ?? '';

  if (!encryptionKeyRing) {
    throw new Error('METALAYER_ENCRYPTION_KEY is required to start MetaLayer API');
  }

  if (postgresUrl) {
    return PostgresConfigurationStore.connect({
      connectionString: postgresUrl,
      encryptionKey: encryptionKeyRing,
    });
  }

  if (!sqlitePath || sqlitePath === ':memory:') {
    return createMemoryConfigurationStore(encryptionKeyRing);
  }

  mkdirSync(dirname(sqlitePath), { recursive: true });
  return new SqliteConfigurationStore({
    sqlitePath,
    encryptionKey: encryptionKeyRing,
  });
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
    routerOptions: {
      // Legacy compressed configs live in a path segment (can exceed Fastify's default 100).
      maxParamLength: 32_768,
    },
  });

  const store = await resolveStore(options);
  const providerCache =
    options.providerCache ??
    (process.env.REDIS_URL
      ? new RedisCache({ url: process.env.REDIS_URL })
      : new MemoryCache());
  const correctionRegistry =
    options.correctionRegistry ??
    (() => {
      const registry = new CorrectionRegistry();
      registry.loadCommunity(loadSampleCommunityCorrections());
      return registry;
    })();
  const metrics = options.metrics ?? new MetricsRegistry();
  const logBuffer = options.logBuffer ?? new BoundedLogBuffer();
  const providerHealth = options.providerHealth ?? new ProviderHealthRegistry();

  app.decorate('configStore', store);
  app.decorate('providerFetch', options.providerFetch);
  app.decorate('providerHealth', providerHealth);
  app.decorate('providerCache', providerCache);
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
    await store.close();
    if (providerCache instanceof RedisCache) {
      await providerCache.close();
    }
  });

  await app.register(corsPlugin);
  await app.register(correlationPlugin);
  await app.register(apiV1Routes, { prefix: '/api/v1' });
  await app.register(nativeManifestRoutes);
  await app.register(nativeStremioRoutes);
  await app.register(legacyStremioRoutes);
  await app.register(spaStaticPlugin, {
    configureRoot: options.configureDist,
    adminRoot: options.adminDist,
  });

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

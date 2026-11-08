import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApiError } from '@metalayer/api-errors';
import {
  CorrectionRegistry,
} from '@metalayer/corrections';
import {
  BoundedLogBuffer,
  MetricsRegistry,
  safeTokenEquals,
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
  sanitizeLogUrl,
  resolveEncryptionKeyRing,
  type EncryptionKeyRing,
} from '@metalayer/security';
import { correlationPlugin } from './plugins/correlation.js';
import { corsPlugin } from './plugins/cors.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { spaStaticPlugin } from './plugins/spa-static.js';
import { apiV1Routes } from './routes/api-v1.js';
import { nativeManifestRoutes } from './routes/native-manifest.js';
import { nativeStremioRoutes } from './routes/native-stremio.js';
import { legacyStremioRoutes } from './routes/legacy-stremio.js';
import { InstanceProviderSettings } from './instance-provider-settings.js';
import { RuntimeSettings } from './runtime-settings.js';

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
  instanceProviders?: InstanceProviderSettings;
  runtimeSettings?: RuntimeSettings;
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
    instanceProviders: InstanceProviderSettings;
    runtimeSettings: RuntimeSettings;
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
  if (env.NODE_ENV === 'production' && env.METALAYER_DEPLOYMENT_MODE === 'server') {
    throw new Error('POSTGRES_URL is required in Server mode');
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
    serializers: {
      req: (req: { method: string; url: string }) => ({ method: req.method, url: sanitizeLogUrl(req.url) }),
    },
    redact: {
      paths: [...FASTIFY_LOG_REDACT_PATHS],
      censor: '[REDACTED]',
    },
  } as NonNullable<Parameters<typeof Fastify>[0]>['logger'];
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? process.env;
  const protectAdmin = env.METALAYER_ADMIN_BASIC_AUTH === 'true';
  const adminToken = env.METALAYER_DASHBOARD_TOKEN?.trim();
  if (protectAdmin && !adminToken) {
    throw new Error('METALAYER_DASHBOARD_TOKEN is required for Admin Basic authentication');
  }
  const app = Fastify({
    logger: buildLoggerOption(options.logger ?? true),
    trustProxy: env.METALAYER_TRUSTED_PROXIES?.split(',').map((proxy) => proxy.trim()).filter(Boolean) ?? false,
    routerOptions: {
      // Legacy compressed configs live in a path segment (can exceed Fastify's default 100).
      maxParamLength: 32_768,
    },
  });

  const store = await resolveStore(options);
  const runtimeSettings = options.runtimeSettings ?? new RuntimeSettings(store, env);
  try {
    if (!options.runtimeSettings) await runtimeSettings.load();
  } catch (error) {
    await store.close();
    throw error;
  }
  const redisUrl = runtimeSettings.get('REDIS_URL');
  if (!redisUrl && !options.providerCache && env.NODE_ENV === 'production' && env.METALAYER_DEPLOYMENT_MODE === 'server') {
    await store.close();
    throw new Error('REDIS_URL is required in Server mode');
  }
  const providerCache =
    options.providerCache ??
    (redisUrl ? new RedisCache({ url: redisUrl }) : new MemoryCache());
  const correctionRegistry =
    options.correctionRegistry ??
    new CorrectionRegistry();
  const metrics = options.metrics ?? new MetricsRegistry();
  const logBuffer = options.logBuffer ?? new BoundedLogBuffer();
  const providerHealth = options.providerHealth ?? new ProviderHealthRegistry();
  const instanceProviders =
    options.instanceProviders ??
    new InstanceProviderSettings(
      options.env ?? process.env,
      await store.listInstanceProviderStates(),
    );

  app.decorate('configStore', store);
  app.decorate('providerFetch', options.providerFetch);
  app.decorate('providerHealth', providerHealth);
  app.decorate('providerCache', providerCache);
  app.decorate('instanceProviders', instanceProviders);
  app.decorate('runtimeSettings', runtimeSettings);
  app.decorate('correctionRegistry', correctionRegistry);
  app.decorate('metrics', metrics);
  app.decorate('logBuffer', logBuffer);
  app.decorate('startedAt', new Date());

  app.addHook('onRequest', async (request) => {
    (request as { _startedAtMs?: number })._startedAtMs = Date.now();
    metrics.increment('requestsTotal');
  });

  app.addHook('preHandler', async (request) => {
    const configId = (request.params as { configId?: string })?.configId;
    if (configId && !options.correctionRegistry) {
      app.correctionRegistry.loadLocal(configId, await store.listLocalCorrections(configId));
    }
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
        message: `${request.method} ${sanitizeLogUrl(request.url)} → ${reply.statusCode}`,
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
  await app.register(rateLimitPlugin);
  if (protectAdmin) {
    const isAdminPath = (url: string) => {
      const path = url.split('?')[0];
      return path === '/admin' || path?.startsWith('/admin/');
    };
    app.addHook('onRequest', async (request, reply) => {
      if (!isAdminPath(request.url)) return;
      const credentials = request.headers.authorization?.match(/^Basic (\S+)$/i)?.[1];
      if (credentials && safeTokenEquals(Buffer.from(credentials, 'base64').toString('utf8'), `operator:${adminToken}`)) return;
      return reply.header('www-authenticate', 'Basic realm="MetaLayer Admin"').code(401).send();
    });
    app.addHook('onSend', async (request, reply, payload) => {
      if (isAdminPath(request.url)) reply.header('cache-control', 'private, no-store');
      return payload;
    });
  }
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
      message: `Route not found: ${request.method} ${sanitizeLogUrl(request.url)}`,
      correlationId: request.correlationId,
      params: {
        method: request.method,
        path: sanitizeLogUrl(request.url),
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

import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApiError } from '@metalayer/api-errors';
import {
  createMemoryConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import type { TmdbFetch } from '@metalayer/providers';
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
}

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
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

  // Fastify logger typing is strict; keep redact config and cast the option object.
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
  app.decorate('configStore', store);
  app.decorate('providerFetch', options.providerFetch);

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
    const error = createApiError({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
      correlationId: request.correlationId ?? 'unknown',
    });
    return reply.status(500).send(error);
  });

  return app;
}

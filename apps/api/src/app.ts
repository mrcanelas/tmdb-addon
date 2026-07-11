import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApiError } from '@metalayer/api-errors';
import {
  createMemoryConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import { correlationPlugin } from './plugins/correlation.js';
import { apiV1Routes } from './routes/api-v1.js';
import { nativeManifestRoutes } from './routes/native-manifest.js';

export interface BuildAppOptions {
  logger?: boolean;
  store?: ConfigurationStore;
  encryptionKey?: string;
  sqlitePath?: string;
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

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  const store = resolveStore(options);
  app.decorate('configStore', store);

  app.addHook('onClose', async () => {
    store.close();
  });

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
    request.log.error(err);
    const error = createApiError({
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unexpected error',
      correlationId: request.correlationId ?? 'unknown',
    });
    return reply.status(500).send(error);
  });

  return app;
}

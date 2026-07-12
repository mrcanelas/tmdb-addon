import type { FastifyPluginAsync } from 'fastify';
import { createRequire } from 'node:module';
import { createApiError } from '@metalayer/api-errors';
import type { ConfigurationStore } from '@metalayer/persistence';

const require = createRequire(import.meta.url);
const { METALAYER } = require('@metalayer/identity') as {
  METALAYER: { manifestId: string; manifestName: string; version: string };
};

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

/**
 * Native MetaLayer manifest route — config id in path, never secrets.
 */
export const nativeManifestRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/c/:configId/manifest.json',
    async (request, reply) => {
      const view = app.configStore.getPublic(request.params.configId);
      if (!view) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Configuration ${request.params.configId} was not found`,
            correlationId: request.correlationId,
            params: { configId: request.params.configId },
          }),
        );
      }

      return {
        id: METALAYER.manifestId,
        version: METALAYER.version,
        name: METALAYER.manifestName,
        description: `MetaLayer configuration "${view.config.name}". Secrets are stored server-side.`,
        resources: ['catalog', 'meta'],
        types: ['movie', 'series'],
        idPrefixes: ['tmdb:'],
        catalogs: [],
        behaviorHints: {
          configurable: true,
          configurationRequired: false,
        },
      };
    },
  );
};

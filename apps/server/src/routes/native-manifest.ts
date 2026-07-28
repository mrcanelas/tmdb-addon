import type { FastifyPluginAsync } from 'fastify';
import { createRequire } from 'node:module';
import { createApiError } from '@metalayer/api-errors';
import {
  applyProfileToConfig,
  findProfile,
  type MetaLayerConfig,
} from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import { buildStremioManifest } from '../stremio/build-manifest.js';

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
 * Native MetaLayer manifest routes — config id in path, never secrets.
 */
export const nativeManifestRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/c/:configId/manifest.json',
    async (request, reply) => {
      const view = await app.configStore.getPublic(request.params.configId);
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

      return buildStremioManifest(
        view.config,
        {
          manifestId: METALAYER.manifestId,
          manifestName: METALAYER.manifestName,
          version: METALAYER.version,
        },
        `MetaLayer configuration "${view.config.name}". Secrets are stored server-side.`,
      );
    },
  );

  app.get<{ Params: { configId: string; profileId: string } }>(
    '/c/:configId/p/:profileId/manifest.json',
    async (request, reply) => {
      const view = await app.configStore.getPublic(request.params.configId);
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

      const profile = findProfile(
        view.config.profiles ?? [],
        request.params.profileId,
      );
      if (!profile || profile.enabled === false) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Profile ${request.params.profileId} was not found`,
            correlationId: request.correlationId,
            params: {
              configId: request.params.configId,
              profileId: request.params.profileId,
            },
          }),
        );
      }

      const effective: MetaLayerConfig = applyProfileToConfig(
        view.config,
        profile,
      );
      return buildStremioManifest(
        effective,
        {
          manifestId: METALAYER.manifestId,
          manifestName: METALAYER.manifestName,
          version: METALAYER.version,
        },
        `MetaLayer profile "${profile.name}" on configuration "${view.config.name}". Secrets are stored server-side.`,
      );
    },
  );
};

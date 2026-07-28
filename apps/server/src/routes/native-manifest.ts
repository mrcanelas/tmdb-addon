import type { FastifyPluginAsync } from 'fastify';
import { createRequire } from 'node:module';
import { createApiError } from '@metalayer/api-errors';
import { toManifestCatalogEntries } from '@metalayer/catalogs';
import {
  applyProfileToConfig,
  findProfile,
  type MetaLayerConfig,
} from '@metalayer/config';
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

function buildManifest(config: MetaLayerConfig, description: string) {
  const catalogs = toManifestCatalogEntries(
    config.catalogs,
    config.localization.metadataLocale,
    config.presentation,
  ).map(({ id, type, name }) => ({
    id,
    type,
    name,
    extra: [{ name: 'skip', isRequired: false }],
  }));

  const types = [...new Set(catalogs.map((catalog) => catalog.type))];

  return {
    id: METALAYER.manifestId,
    version: METALAYER.version,
    name: METALAYER.manifestName,
    description,
    resources: catalogs.length > 0 ? ['catalog', 'meta'] : ['meta'],
    types: types.length > 0 ? types : ['movie', 'series'],
    idPrefixes: ['tt', 'tmdb:', 'anilist:'],
    catalogs,
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
  };
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

      return buildManifest(
        view.config,
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

      const effective = applyProfileToConfig(view.config, profile);
      return buildManifest(
        effective,
        `MetaLayer profile "${profile.name}" on configuration "${view.config.name}". Secrets are stored server-side.`,
      );
    },
  );
};

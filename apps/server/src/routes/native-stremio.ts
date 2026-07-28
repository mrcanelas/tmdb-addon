import type { FastifyPluginAsync } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  applyProfileToConfig,
  findProfile,
  type MetaLayerConfig,
} from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { CorrectionRegistry } from '@metalayer/corrections';
import type { ProviderHealthRegistry, TmdbFetch } from '@metalayer/providers';
import type { CacheStore } from '@metalayer/cache';
import { ProviderError } from '@metalayer/providers';
import {
  findCatalogByManifestId,
  loadCatalogMetas,
  parseSkip,
  resolveStremioMeta,
  stremioType,
  type SecretResolver,
} from '../stremio/catalog-meta.js';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
    correctionRegistry: CorrectionRegistry;
  }
}

const PAGE_SIZE = 100;

type ReplyLike = {
  status: (code: number) => { send: (body: unknown) => unknown };
};

function vaultSecretResolver(
  app: { configStore: ConfigurationStore },
  configId: string,
): SecretResolver {
  return async (provider) =>
    app.configStore.getSecretPlaintext(configId, provider);
}

function resolveEffectiveConfig(
  config: MetaLayerConfig,
  profileId: string | undefined,
  reply: ReplyLike,
  correlationId: string,
  configId: string,
): MetaLayerConfig | { error: unknown } {
  if (!profileId) return config;

  const profile = findProfile(config.profiles ?? [], profileId);
  if (!profile || profile.enabled === false) {
    return {
      error: reply.status(404).send(
        createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Profile ${profileId} was not found`,
          correlationId,
          params: { configId, profileId },
        }),
      ),
    };
  }
  return applyProfileToConfig(config, profile);
}

/**
 * Public Stremio catalog/meta routes for native MetaLayer configs.
 * Profile installs use `/c/:configId/p/:profileId/...` so Stremio keeps the same base.
 * No secrets in the URL — credentials come from vault/env.
 */
export const nativeStremioRoutes: FastifyPluginAsync = async (app) => {
  async function handleCatalog(
    request: {
      params: {
        configId: string;
        type: string;
        id: string;
        extra?: string;
        profileId?: string;
      };
      correlationId: string;
    },
    reply: ReplyLike,
  ) {
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

    const effective = resolveEffectiveConfig(
      view.config,
      request.params.profileId,
      reply,
      request.correlationId,
      view.configId,
    );
    if ('error' in effective) return effective.error;

    const catalog = findCatalogByManifestId(
      effective.catalogs,
      request.params.type,
      request.params.id,
    );
    if (!catalog) {
      return { metas: [] };
    }

    const skip = parseSkip(request.params.extra);
    const page = Math.floor(skip / PAGE_SIZE) + 1;

    try {
      const metas = await loadCatalogMetas(
        app,
        effective,
        catalog,
        page,
        request.correlationId,
        vaultSecretResolver(app, view.configId),
      );
      return {
        metas: metas.map((meta) => ({
          id: meta.id,
          type: stremioType(meta.type),
          name: meta.name,
          poster: meta.poster ?? undefined,
          releaseInfo: meta.releaseInfo,
        })),
      };
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'auth') {
        return { metas: [] };
      }
      return { metas: [] };
    }
  }

  async function handleMeta(
    request: {
      params: {
        configId: string;
        type: string;
        id: string;
        profileId?: string;
      };
      correlationId: string;
    },
    reply: ReplyLike,
  ) {
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

    const effective = resolveEffectiveConfig(
      view.config,
      request.params.profileId,
      reply,
      request.correlationId,
      view.configId,
    );
    if ('error' in effective) return effective.error;

    const type = request.params.type;
    if (type !== 'movie' && type !== 'series' && type !== 'anime') {
      return reply.status(404).send({ meta: null });
    }

    const result = await resolveStremioMeta(
      app,
      effective,
      type,
      request.params.id,
      request.correlationId,
      vaultSecretResolver(app, view.configId),
      { configIdForCorrections: view.configId },
    );
    return reply.status(result.status).send(result.body);
  }

  app.get<{
    Params: { configId: string; type: string; id: string };
  }>('/c/:configId/catalog/:type/:id.json', async (request, reply) =>
    handleCatalog({ ...request, params: { ...request.params } }, reply),
  );

  app.get<{
    Params: { configId: string; type: string; id: string; extra: string };
  }>('/c/:configId/catalog/:type/:id/:extra.json', async (request, reply) =>
    handleCatalog(request, reply),
  );

  app.get<{
    Params: { configId: string; profileId: string; type: string; id: string };
  }>(
    '/c/:configId/p/:profileId/catalog/:type/:id.json',
    async (request, reply) => handleCatalog(request, reply),
  );

  app.get<{
    Params: {
      configId: string;
      profileId: string;
      type: string;
      id: string;
      extra: string;
    };
  }>(
    '/c/:configId/p/:profileId/catalog/:type/:id/:extra.json',
    async (request, reply) => handleCatalog(request, reply),
  );

  app.get<{
    Params: { configId: string; type: string; id: string };
  }>('/c/:configId/meta/:type/:id.json', async (request, reply) =>
    handleMeta(request, reply),
  );

  app.get<{
    Params: { configId: string; profileId: string; type: string; id: string };
  }>('/c/:configId/p/:profileId/meta/:type/:id.json', async (request, reply) =>
    handleMeta(request, reply),
  );
};

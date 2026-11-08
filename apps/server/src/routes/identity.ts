import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import type { CacheStore } from '@metalayer/cache';
import {
  buildIdentityDiagnostics,
  IdentityMappingCache,
  precedenceScore,
  resolveIdentityMapping,
  type ProviderIdBag,
} from '@metalayer/identity-graph';
import {
  ProviderError,
  TmdbProviderAdapter,
} from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { ProviderHealthRegistry, TmdbFetch } from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

async function requireEdit(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  configId: string,
) {
  const credential = readEditCredential(request);
  if (!credential || !await app.configStore.verifyEditAccess(configId, credential)) {
    const exists = await app.configStore.getPublic(configId);
    if (!exists) {
      return {
        ok: false as const,
        status: 404,
        body: createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Configuration ${configId} was not found`,
          correlationId: request.correlationId,
          params: { configId },
        }),
      };
    }
    return {
      ok: false as const,
      status: 401,
      body: createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Edit credential is invalid',
        correlationId: request.correlationId,
      }),
    };
  }
  return { ok: true as const };
}

const identityCaches = new WeakMap<object, IdentityMappingCache>();

function getIdentityCache(providerCache: CacheStore): IdentityMappingCache {
  let cache = identityCaches.get(providerCache);
  if (!cache) {
    cache = new IdentityMappingCache(providerCache);
    identityCaches.set(providerCache, cache);
  }
  return cache;
}

async function gatherIdsFromPublicId(
  app: {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
  },
  configId: string,
  publicId: string,
  correlationId: string,
  apiKey?: string,
): Promise<ProviderIdBag> {
  const view = (await app.configStore.getPublic(configId))!;
  const key =
    apiKey ||
    await app.configStore.getSecretPlaintext(configId, 'tmdb') ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  const adapter = createAppProviderAdapter(app, 'tmdb', {
    apiKey: key,
    cache: app.providerCache,
    stremioPublicId: view.config.identity?.stremioPublicId || 'imdb',
  });

  if (!(adapter instanceof TmdbProviderAdapter)) {
    throw new ProviderError({
      code: 'upstream',
      providerId: 'tmdb',
      message: 'TMDB adapter unavailable',
      retryable: false,
    });
  }

  const movie = await adapter.getMovieByPublicId(
    {
      correlationId,
      locale: view.config.localization.metadataLocale,
      region: view.config.localization.contentRegion,
      apiKey: key,
    },
    publicId,
  );

  return {
    tmdb: movie.id,
    imdb: movie.imdbId ?? null,
  };
}

export const identityRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: { configId: string };
    Body: {
      ids?: ProviderIdBag;
      publicId?: string;
      mediaType?: 'movie' | 'series' | 'anime';
      apiKey?: string;
    };
  }>('/configurations/:configId/identity/resolve', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const body = request.body ?? {};
    const entityKind =
      body.mediaType === 'anime'
        ? 'work'
        : body.mediaType === 'series'
          ? 'series'
          : 'movie';

    try {
      let ids = body.ids ?? {};
      if (body.publicId && !body.ids?.tmdb && !body.ids?.imdb) {
        const cache = getIdentityCache(app.providerCache);
        const cached =
          (await cache.get('imdb', body.publicId, entityKind)) ||
          (await cache.get('tmdb', body.publicId, entityKind));
        if (cached) {
          return {
            mapping: cached,
            diagnostics: buildIdentityDiagnostics(cached, precedenceScore),
            cacheStatus: 'hit',
            correlationId: request.correlationId,
          };
        }
        ids = await gatherIdsFromPublicId(
          app,
          request.params.configId,
          body.publicId,
          request.correlationId,
          body.apiKey,
        );
      }

      if (!ids.tmdb && !ids.imdb && !ids.tvdb && !ids.mal && !ids.anilist && !ids.kitsu) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Provide ids or publicId',
            correlationId: request.correlationId,
            params: { field: 'ids' },
          }),
        );
      }

      const mapping = resolveIdentityMapping({ ids, entityKind });
      await getIdentityCache(app.providerCache).set(mapping, entityKind);

      return {
        mapping,
        diagnostics: buildIdentityDiagnostics(mapping, precedenceScore),
        cacheStatus: 'miss',
        correlationId: request.correlationId,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code: 'upstream',
              providerId: 'tmdb',
              message: 'Identity resolve failed',
              cause: error,
            });
      const status =
        providerError.code === 'auth'
          ? 400
          : providerError.code === 'not_found' || providerError.code === 'validation'
            ? 404
            : 502;
      return reply.status(status).send(
        createApiError({
          code:
            providerError.code === 'auth'
              ? 'SOURCE_CREDENTIAL_MISSING'
              : 'PROVIDER_UNAVAILABLE',
          message: providerError.message,
          correlationId: request.correlationId,
          params: { provider: providerError.providerId },
        }),
      );
    }
  });

  app.post<{
    Params: { configId: string };
    Body: {
      ids?: ProviderIdBag;
      mediaType?: 'movie' | 'series' | 'anime';
    };
  }>('/configurations/:configId/identity/diagnostics', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const ids = request.body?.ids;
    if (!ids || (!ids.tmdb && !ids.imdb && !ids.tvdb && !ids.mal && !ids.anilist && !ids.kitsu)) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Provide ids for diagnostics',
          correlationId: request.correlationId,
          params: { field: 'ids' },
        }),
      );
    }

    const entityKind =
      request.body?.mediaType === 'anime'
        ? 'work'
        : request.body?.mediaType === 'series'
          ? 'series'
          : 'movie';

    const mapping = resolveIdentityMapping({ ids, entityKind });
    return {
      diagnostics: buildIdentityDiagnostics(mapping, precedenceScore),
      correlationId: request.correlationId,
    };
  });
};

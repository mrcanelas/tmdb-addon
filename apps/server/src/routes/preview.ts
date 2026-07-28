import type { FastifyPluginAsync } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import { MemoryCache, RedisCache, type CacheStore } from '@metalayer/cache';
import {
  ProviderError,
  TmdbProviderAdapter,
  ImdbProviderAdapter,
} from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

type PreviewQuery = {
  locale?: string;
  region?: string;
  apiKey?: string;
  /** Override ADR 0006 default (`imdb`). */
  publicIdMode?: 'imdb' | 'tmdb';
};

function providerCacheStats(cache: CacheStore) {
  if (cache instanceof MemoryCache || cache instanceof RedisCache) {
    return cache.stats();
  }
  return { size: -1, hits: 0, misses: 0, stales: 0 };
}

export const previewRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string }; Querystring: PreviewQuery }>(
    '/preview/movie/:id',
    async (request, reply) => {
      const apiKey =
        request.query.apiKey ||
        process.env.METALAYER_TMDB_API_KEY ||
        process.env.TMDB_API;

      const adapter = createAppProviderAdapter(app, 'tmdb', {
        apiKey,
        cache: app.providerCache,
        stremioPublicId: request.query.publicIdMode || 'imdb',
      });

      if (!(adapter instanceof TmdbProviderAdapter)) {
        return reply.status(500).send(
          createApiError({
            code: 'INTERNAL_ERROR',
            message: 'TMDB adapter unavailable',
            correlationId: request.correlationId,
          }),
        );
      }

      try {
        const movie = await adapter.getMovieByPublicId(
          {
            correlationId: request.correlationId,
            locale: request.query.locale || 'en-US',
            region: request.query.region,
            apiKey,
          },
          request.params.id,
        );

        return {
          movie,
          cacheStatus: adapter.lastCacheStatus,
          cache: providerCacheStats(app.providerCache),
          correlationId: request.correlationId,
        };
      } catch (error) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError({
                code: 'upstream',
                providerId: 'tmdb',
                message: 'TMDB preview failed',
                cause: error,
              });

        const status =
          providerError.code === 'auth'
            ? 400
            : providerError.code === 'not_found' || providerError.code === 'validation'
              ? 404
              : 502;

        return reply.status(status).send({
          ok: false,
          error: {
            code:
              providerError.code === 'auth'
                ? 'SOURCE_CREDENTIAL_MISSING'
                : 'PROVIDER_UNAVAILABLE',
            providerCode: providerError.code,
            message: providerError.message,
          },
          correlationId: request.correlationId,
        });
      }
    },
  );

  app.get<{
    Params: { imdbId: string };
    Querystring: PreviewQuery & { type?: 'movie' | 'series' };
  }>('/preview/rating/:imdbId', async (request, reply) => {
    const adapter = createAppProviderAdapter(app, 'imdb', {
      cache: app.providerCache,
    });

    if (!(adapter instanceof ImdbProviderAdapter)) {
      return reply.status(500).send(
        createApiError({
          code: 'INTERNAL_ERROR',
          message: 'IMDb / Cinemeta adapter unavailable',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const rating = await adapter.getRating(
        { correlationId: request.correlationId },
        request.params.imdbId,
        request.query.type || 'movie',
      );
      return {
        rating,
        cacheStatus: adapter.lastCacheStatus,
        cache: providerCacheStats(app.providerCache),
        correlationId: request.correlationId,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code: 'upstream',
              providerId: 'imdb',
              message: 'IMDb rating preview failed',
              cause: error,
            });
      const status =
        providerError.code === 'validation' || providerError.code === 'not_found'
          ? 404
          : 502;
      return reply.status(status).send({
        ok: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          providerCode: providerError.code,
          message: providerError.message,
        },
        correlationId: request.correlationId,
      });
    }
  });

  app.get('/cache/stats', async (request) => {
    return {
      cache: providerCacheStats(app.providerCache),
      correlationId: request.correlationId,
    };
  });
};

export type { CacheStore };
export { MemoryCache };

import type { FastifyPluginAsync } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import { MemoryCache } from '@metalayer/cache';
import {
  ProviderError,
  TmdbProviderAdapter,
  createProviderAdapter,
} from '@metalayer/providers';

type PreviewQuery = {
  locale?: string;
  region?: string;
  apiKey?: string;
  /** Override ADR 0006 default (`imdb`). */
  publicIdMode?: 'imdb' | 'tmdb';
};

export const previewRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string }; Querystring: PreviewQuery }>(
    '/preview/movie/:id',
    async (request, reply) => {
      const apiKey =
        request.query.apiKey ||
        process.env.METALAYER_TMDB_API_KEY ||
        process.env.TMDB_API;

      const adapter = createProviderAdapter('tmdb', {
        apiKey,
        fetchImpl: app.providerFetch,
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
          cache: app.providerCache.stats(),
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

  app.get('/cache/stats', async (request) => {
    return {
      cache: app.providerCache.stats(),
      correlationId: request.correlationId,
    };
  });
};

export type { MemoryCache };

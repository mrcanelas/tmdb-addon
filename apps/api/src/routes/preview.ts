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
};

export const previewRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { tmdbId: string }; Querystring: PreviewQuery }>(
    '/preview/movie/:tmdbId',
    async (request, reply) => {
      const tmdbId = Number(request.params.tmdbId);
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'tmdbId must be a positive number',
            correlationId: request.correlationId,
            params: { field: 'tmdbId' },
          }),
        );
      }

      const apiKey =
        request.query.apiKey ||
        process.env.METALAYER_TMDB_API_KEY ||
        process.env.TMDB_API;

      const adapter = createProviderAdapter('tmdb', {
        apiKey,
        fetchImpl: app.providerFetch,
        cache: app.providerCache,
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
        const movie = await adapter.getMovie(
          {
            correlationId: request.correlationId,
            locale: request.query.locale || 'en-US',
            region: request.query.region,
            apiKey,
          },
          tmdbId,
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

        return reply.status(providerError.code === 'auth' ? 400 : 502).send({
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

// Keep MemoryCache type visible for Fastify decoration typing consumers.
export type { MemoryCache };

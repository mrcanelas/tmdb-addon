import type { FastifyPluginAsync } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  resolveCatalogResults,
  sortCatalogsByPosition,
  type CatalogMetaPreview,
} from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig } from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  AnilistProviderAdapter,
  KitsuProviderAdapter,
  MalJikanProviderAdapter,
  ProviderError,
  TmdbProviderAdapter,
  createProviderAdapter,
  type TmdbFetch,
} from '@metalayer/providers';
import type { MemoryCache } from '@metalayer/cache';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerCache: MemoryCache;
  }
}

const PAGE_SIZE = 100;

function tmdbImageUrl(
  path: string | null | undefined,
  size: 'w342' | 'w500' | 'w1280',
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function findCatalogByManifestId(
  catalogs: CatalogDefinition[],
  type: string,
  catalogId: string,
): CatalogDefinition | undefined {
  return sortCatalogsByPosition(catalogs)
    .filter((catalog) => catalog.enabled)
    .find(
      (catalog) =>
        catalog.mediaType === type &&
        `${catalog.provider}.${catalog.providerCatalogId}` === catalogId,
    );
}

function parseSkip(extra?: string): number {
  if (!extra) return 0;
  const match = /(?:^|&)skip=(\d+)/.exec(extra);
  return match ? Number(match[1]) : 0;
}

function stremioType(
  mediaType: CatalogDefinition['mediaType'] | 'movie' | 'series' | 'anime',
): 'movie' | 'series' {
  return mediaType === 'movie' ? 'movie' : 'series';
}

/** Accept `anilist:5114` or bare numeric AniList ids. */
function parseAnimePublicId(publicId: string): number | null {
  const match = /^(?:anilist:)?(\d+)$/i.exec(publicId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function loadCatalogMetas(
  app: {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerCache: MemoryCache;
  },
  configId: string,
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
  page: number,
  correlationId: string,
): Promise<CatalogMetaPreview[]> {
  const locale = config.localization.metadataLocale || 'en-US';
  const region =
    config.localization.availabilityRegion ||
    config.localization.contentRegion;
  const apiKey =
    app.configStore.getSecretPlaintext(configId, 'tmdb') ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  const resolved = await resolveCatalogResults(
    config.catalogs,
    catalog.instanceId,
    async (source) => {
      const ctx = {
        correlationId,
        locale,
        region,
        apiKey,
      };

      if (source.provider === 'tmdb') {
        const adapter = createProviderAdapter('tmdb', {
          apiKey,
          fetchImpl: app.providerFetch,
          cache: app.providerCache,
          stremioPublicId: config.identity?.stremioPublicId || 'imdb',
        });
        if (!(adapter instanceof TmdbProviderAdapter)) {
          throw new Error('TMDB adapter unavailable');
        }
        const items = await adapter.getCatalogPage(ctx, {
          providerCatalogId: source.providerCatalogId,
          mediaType: source.mediaType,
          page,
        });
        return items.map(
          (item): CatalogMetaPreview => ({
            id: item.publicId,
            type: item.mediaType,
            name: item.name,
            poster: tmdbImageUrl(item.posterPath, 'w342'),
            releaseInfo: item.releaseDate,
            provider: 'tmdb',
          }),
        );
      }

      if (
        source.provider === 'anilist' ||
        source.provider === 'mal' ||
        source.provider === 'kitsu'
      ) {
        const adapter = createProviderAdapter(source.provider, {
          fetchImpl: app.providerFetch,
          cache: app.providerCache,
          jikanBaseUrl: process.env.METALAYER_JIKAN_URL,
        });
        if (
          !(adapter instanceof AnilistProviderAdapter) &&
          !(adapter instanceof MalJikanProviderAdapter) &&
          !(adapter instanceof KitsuProviderAdapter)
        ) {
          throw new Error(`${source.provider} anime adapter unavailable`);
        }
        const items = await adapter.getCatalogPage(ctx, {
          providerCatalogId: source.providerCatalogId,
          mediaType: 'anime',
          page,
        });
        return items.map(
          (item): CatalogMetaPreview => ({
            id: item.publicId,
            type: 'anime',
            name: item.name,
            poster: item.posterUrl ?? undefined,
            provider: source.provider,
          }),
        );
      }

      return [];
    },
  );

  return resolved.metas;
}

/**
 * Public Stremio catalog/meta routes for native MetaLayer configs.
 * No secrets in the URL — credentials come from vault/env.
 */
export const nativeStremioRoutes: FastifyPluginAsync = async (app) => {
  async function handleCatalog(
    request: {
      params: { configId: string; type: string; id: string; extra?: string };
      correlationId: string;
    },
    reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  ) {
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

    const catalog = findCatalogByManifestId(
      view.config.catalogs,
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
        view.configId,
        view.config,
        catalog,
        page,
        request.correlationId,
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
    Params: { configId: string; type: string; id: string };
  }>('/c/:configId/meta/:type/:id.json', async (request, reply) => {
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

    const type = request.params.type;
    if (type !== 'movie' && type !== 'series' && type !== 'anime') {
      return reply.status(404).send({ meta: null });
    }

    const ctx = {
      correlationId: request.correlationId,
      locale: view.config.localization.metadataLocale || 'en-US',
      region:
        view.config.localization.availabilityRegion ||
        view.config.localization.contentRegion,
    };

    if (type === 'anime') {
      try {
        const anilistId = parseAnimePublicId(request.params.id);
        if (anilistId === null) {
          return reply.status(404).send({ meta: null });
        }
        const adapter = createProviderAdapter('anilist', {
          fetchImpl: app.providerFetch,
        });
        if (!(adapter instanceof AnilistProviderAdapter)) {
          return reply.status(502).send({ meta: null });
        }
        const anime = await adapter.getAnime(ctx, anilistId);
        const name =
          anime.titles.localized ||
          anime.titles.english ||
          anime.titles.romaji ||
          anime.titles.native ||
          anime.publicId;
        return {
          meta: {
            id: anime.publicId,
            type: anime.format === 'movie' ? ('movie' as const) : ('series' as const),
            name,
            poster: anime.posterUrl ?? undefined,
            description: anime.description,
            imdbRating:
              anime.averageScore !== undefined
                ? anime.averageScore.toFixed(1)
                : undefined,
          },
        };
      } catch (error) {
        if (error instanceof ProviderError && error.code === 'not_found') {
          return reply.status(404).send({ meta: null });
        }
        return reply.status(502).send({ meta: null });
      }
    }

    const apiKey =
      app.configStore.getSecretPlaintext(view.configId, 'tmdb') ||
      process.env.METALAYER_TMDB_API_KEY ||
      process.env.TMDB_API;

    const adapter = createProviderAdapter('tmdb', {
      apiKey,
      fetchImpl: app.providerFetch,
      cache: app.providerCache,
      stremioPublicId: view.config.identity?.stremioPublicId || 'imdb',
    });

    if (!(adapter instanceof TmdbProviderAdapter)) {
      return reply.status(502).send({ meta: null });
    }

    try {
      if (type === 'series') {
        const series = await adapter.getSeriesByPublicId(
          { ...ctx, apiKey },
          request.params.id,
        );
        return {
          meta: {
            id: series.publicId,
            type: 'series' as const,
            name: series.title,
            poster: tmdbImageUrl(series.posterPath, 'w500'),
            background: tmdbImageUrl(series.backdropPath, 'w1280'),
            description: series.overview,
            releaseInfo: series.firstAirDate,
            imdbRating:
              series.voteAverage !== undefined
                ? series.voteAverage.toFixed(1)
                : undefined,
          },
        };
      }

      const movie = await adapter.getMovieByPublicId(
        { ...ctx, apiKey },
        request.params.id,
      );

      return {
        meta: {
          id: movie.publicId,
          type: 'movie' as const,
          name: movie.title,
          poster: tmdbImageUrl(movie.posterPath, 'w500'),
          background: tmdbImageUrl(movie.backdropPath, 'w1280'),
          description: movie.overview,
          releaseInfo: movie.releaseDate,
          imdbRating:
            movie.voteAverage !== undefined
              ? movie.voteAverage.toFixed(1)
              : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'not_found') {
        return reply.status(404).send({ meta: null });
      }
      return reply.status(502).send({ meta: null });
    }
  });
};

import {
  resolveCatalogResults,
  sortCatalogsByPosition,
  type CatalogMetaPreview,
} from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig } from '@metalayer/config';
import {
  applyEpisodeCorrectionsToVideos,
  correctionsReferenceSpecialSeason,
  filterCorrectionsForIdentity,
  type CorrectionRegistry,
} from '@metalayer/corrections';
import {
  AnilistProviderAdapter,
  KitsuProviderAdapter,
  MalJikanProviderAdapter,
  ProviderError,
  PublicMetaDBAdapter,
  TmdbProviderAdapter,
  type ProviderHealthRegistry,
  type TmdbFetch,
} from '@metalayer/providers';
import type { CacheStore } from '@metalayer/cache';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

export type SecretResolver = (provider: string) => Promise<string | null | undefined>;

export type StremioAppContext = {
  providerFetch?: TmdbFetch;
  providerHealth: ProviderHealthRegistry;
  providerCache: CacheStore;
  correctionRegistry?: CorrectionRegistry;
};

/** Legacy TMDB Addon catalog id aliases → MetaLayer providerCatalogId. */
const LEGACY_CATALOG_ALIASES: Record<string, string> = {
  top: 'popular',
  year: 'popular',
  language: 'popular',
  latest: 'now_playing',
};

export function tmdbImageUrl(
  path: string | null | undefined,
  size: 'w342' | 'w500' | 'w1280',
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function parseSkip(extra?: string): number {
  if (!extra) return 0;
  const match = /(?:^|&)skip=(\d+)/.exec(extra);
  return match ? Number(match[1]) : 0;
}

export function stremioType(
  mediaType: CatalogDefinition['mediaType'] | 'movie' | 'series' | 'anime',
): 'movie' | 'series' {
  return mediaType === 'movie' ? 'movie' : 'series';
}

/** Accept `anilist:5114` or bare numeric AniList ids. */
export function parseAnimePublicId(publicId: string): number | null {
  const match = /^(?:anilist:)?(\d+)$/i.exec(publicId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function catalogIdCandidates(catalogId: string): string[] {
  const candidates = [catalogId];
  const dot = catalogId.indexOf('.');
  if (dot === -1) return candidates;
  const provider = catalogId.slice(0, dot);
  const rest = catalogId.slice(dot + 1);
  const alias = LEGACY_CATALOG_ALIASES[rest];
  if (alias && alias !== rest) {
    candidates.push(`${provider}.${alias}`);
  }
  return candidates;
}

export function findCatalogByManifestId(
  catalogs: CatalogDefinition[],
  type: string,
  catalogId: string,
): CatalogDefinition | undefined {
  const enabled = sortCatalogsByPosition(catalogs).filter(
    (catalog) => catalog.enabled,
  );
  for (const candidate of catalogIdCandidates(catalogId)) {
    const found = enabled.find(
      (catalog) =>
        catalog.mediaType === type &&
        `${catalog.provider}.${catalog.providerCatalogId}` === candidate,
    );
    if (found) return found;
  }
  return undefined;
}

export async function loadCatalogMetas(
  app: StremioAppContext,
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
  page: number,
  correlationId: string,
  getSecret: SecretResolver,
): Promise<CatalogMetaPreview[]> {
  const locale = config.localization.metadataLocale || 'en-US';
  const region =
    config.localization.availabilityRegion ||
    config.localization.contentRegion;
  const apiKey =
    (await getSecret('tmdb')) ||
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
        const adapter = createAppProviderAdapter(app, 'tmdb', {
          apiKey,
          cache: app.providerCache,
          stremioPublicId: config.identity?.stremioPublicId || 'imdb',
        });
        if (!(adapter instanceof TmdbProviderAdapter)) {
          throw new Error('TMDB adapter unavailable');
        }
        const providerCatalogId =
          LEGACY_CATALOG_ALIASES[source.providerCatalogId] ??
          source.providerCatalogId;
        const items = await adapter.getCatalogPage(ctx, {
          providerCatalogId,
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
        const adapter = createAppProviderAdapter(app, source.provider, {
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

      if (source.provider === 'publicmetadb') {
        const pmdbKey = await getSecret('publicmetadb');
        if (!pmdbKey) return [];
        const adapter = createAppProviderAdapter(app, 'publicmetadb', {
          apiKey: pmdbKey,
          cache: app.providerCache,
        });
        if (!(adapter instanceof PublicMetaDBAdapter)) return [];
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
            provider: 'publicmetadb',
          }),
        );
      }

      return [];
    },
  );

  return resolved.metas;
}

export async function resolveStremioMeta(
  app: StremioAppContext,
  config: MetaLayerConfig,
  type: 'movie' | 'series' | 'anime',
  publicId: string,
  correlationId: string,
  getSecret: SecretResolver,
  options: { configIdForCorrections?: string } = {},
): Promise<
  | { status: 200; body: { meta: Record<string, unknown> } }
  | { status: 404 | 502; body: { meta: null } }
> {
  const ctx = {
    correlationId,
    locale: config.localization.metadataLocale || 'en-US',
    region:
      config.localization.availabilityRegion ||
      config.localization.contentRegion,
  };

  if (type === 'anime') {
    try {
      const anilistId = parseAnimePublicId(publicId);
      if (anilistId === null) {
        return { status: 404, body: { meta: null } };
      }
      const adapter = createAppProviderAdapter(app, 'anilist', {});
      if (!(adapter instanceof AnilistProviderAdapter)) {
        return { status: 502, body: { meta: null } };
      }
      const anime = await adapter.getAnime(ctx, anilistId);
      const name =
        anime.titles.localized ||
        anime.titles.english ||
        anime.titles.romaji ||
        anime.titles.native ||
        anime.publicId;
      return {
        status: 200,
        body: {
          meta: {
            id: anime.publicId,
            type:
              anime.format === 'movie' ? ('movie' as const) : ('series' as const),
            name,
            poster: anime.posterUrl ?? undefined,
            description: anime.description,
            imdbRating:
              anime.averageScore !== undefined
                ? anime.averageScore.toFixed(1)
                : undefined,
          },
        },
      };
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'not_found') {
        return { status: 404, body: { meta: null } };
      }
      return { status: 502, body: { meta: null } };
    }
  }

  const apiKey =
    (await getSecret('tmdb')) ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  const adapter = createAppProviderAdapter(app, 'tmdb', {
    apiKey,
    cache: app.providerCache,
    stremioPublicId: config.identity?.stremioPublicId || 'imdb',
  });

  if (!(adapter instanceof TmdbProviderAdapter)) {
    return { status: 502, body: { meta: null } };
  }

  try {
    if (type === 'series') {
      const series = await adapter.getSeriesByPublicId(
        { ...ctx, apiKey },
        publicId,
      );
      let videos: Array<{
        id: string;
        title: string;
        name: string;
        season: number;
        episode: number;
        released?: string;
        thumbnail?: string;
        overview?: string;
      }> = [];
      try {
        const correctionConfigId = options.configIdForCorrections;
        const resolvedCorrections =
          correctionConfigId && app.correctionRegistry
            ? app.correctionRegistry.listResolved(correctionConfigId)
            : [];
        const seriesCorrections = filterCorrectionsForIdentity(
          resolvedCorrections,
          { imdb: series.imdbId, tmdb: series.id },
        );
        const includeSpecials =
          correctionsReferenceSpecialSeason(seriesCorrections);
        const episodes = await adapter.getSeriesEpisodes(
          { ...ctx, apiKey },
          series,
          { includeSpecials },
        );
        videos = applyEpisodeCorrectionsToVideos(
          episodes.map((episode) => {
            const id = series.imdbId
              ? `${series.imdbId}:${episode.seasonNumber}:${episode.episodeNumber}`
              : `tmdb:${series.id}:${episode.seasonNumber}:${episode.episodeNumber}`;
            return {
              id,
              title: episode.name,
              name: episode.name,
              season: episode.seasonNumber,
              episode: episode.episodeNumber,
              released: episode.airDate,
              thumbnail: tmdbImageUrl(episode.stillPath, 'w500'),
              overview: episode.overview,
            };
          }),
          seriesCorrections,
          { imdbId: series.imdbId, tmdbId: series.id },
        );
      } catch {
        videos = [];
      }
      return {
        status: 200,
        body: {
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
            videos,
            behaviorHints: {
              hasScheduledVideos: videos.length > 0,
            },
          },
        },
      };
    }

    const movie = await adapter.getMovieByPublicId(
      { ...ctx, apiKey },
      publicId,
    );

    return {
      status: 200,
      body: {
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
      },
    };
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'not_found') {
      return { status: 404, body: { meta: null } };
    }
    return { status: 502, body: { meta: null } };
  }
}

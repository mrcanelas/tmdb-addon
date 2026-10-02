import { applyCatalogPolicy, type CatalogWarning } from './catalog-policy.js';
import { resolveMetadata, applyPresentation } from '@metalayer/metadata-resolver';
import { gatherLiveBag } from './gather-fields.js';
import {
  resolveCatalogResults,
  sortCatalogsByPosition,
  type CatalogMetaPreview,
} from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig } from '@metalayer/config';
import {
  applyEpisodeCorrectionsToVideos,
  applyMetadataCorrections,
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
import { tmdbCatalogItemToMetaPreview } from './tmdb-catalog-meta.js';
import {
  isAccountCatalogProvider,
  loadAccountCatalogPage,
  loadStaticCatalogPage,
} from './account-catalogs.js';
import { resolveAnimeEpisodeOrder } from './anime-episodes.js';
import type { AnimeVideo } from '@metalayer/anime';

/**
 * Resolves a per-configuration secret. `kind` defaults to `api_key`;
 * `oauth_access` is used for connected tracking accounts.
 */
export type SecretResolver = (
  provider: string,
  kind?: 'api_key' | 'oauth_access',
) => Promise<string | null | undefined>;

/** Minimal runtime-settings reader (Dashboard-managed values, W5). */
export interface RuntimeSettingsReader {
  getNumber?(key: string): number | undefined;
  getBoolean?(key: string): boolean | undefined;
  getString?(key: string): string | undefined;
}

export type StremioAppContext = {
  providerFetch?: TmdbFetch;
  providerHealth: ProviderHealthRegistry;
  providerCache: CacheStore;
  correctionRegistry?: CorrectionRegistry;
  runtimeSettings?: RuntimeSettingsReader;
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

export interface CatalogExtra {
  skip: number;
  search?: string;
  genre?: string;
}

/** Stremio `extra` path segment: `skip=20&search=foo&genre=Drama` (URL-encoded). */
export function parseCatalogExtra(extra?: string): CatalogExtra {
  const out: CatalogExtra = { skip: 0 };
  if (!extra) return out;
  for (const pair of extra.split('&')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    let value: string;
    try {
      value = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
    } catch {
      value = pair.slice(eq + 1);
    }
    if (key === 'skip') {
      const skip = Number(value);
      if (Number.isFinite(skip) && skip >= 0) out.skip = Math.floor(skip);
    } else if (key === 'search') {
      const trimmed = value.trim();
      if (trimmed) out.search = trimmed.slice(0, 200);
    } else if (key === 'genre') {
      const trimmed = value.trim();
      if (trimmed) out.genre = trimmed.slice(0, 100);
    }
  }
  return out;
}

export function parseSkip(extra?: string): number {
  return parseCatalogExtra(extra).skip;
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
        (`${catalog.provider}.${catalog.providerCatalogId}` === candidate ||
          `${catalog.provider}.${catalog.providerCatalogId}~${catalog.instanceId}` === candidate),
    );
    if (found) return found;
  }
  return undefined;
}

export interface LoadCatalogPageOptions {
  /** When false, rules still filter but no sorting plan runs (the window sorts the whole buffer). */
  sort?: boolean;
}

export async function loadCatalogPage(
  app: StremioAppContext,
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
  page: number,
  correlationId: string,
  getSecret: SecretResolver,
  options: LoadCatalogPageOptions = {},
): Promise<{ metas: CatalogMetaPreview[]; hasMore: boolean; warnings: CatalogWarning[]; mode?: string; activeSourceId?: string }> {
  const policyOptions = { sort: options.sort };
  const locale = config.localization.metadataLocale || 'en-US';
  const region =
    config.localization.availabilityRegion ||
    config.localization.contentRegion;
  const apiKey =
    (await getSecret('tmdb')) ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  let hasMore = false;
  const policyWarnings: CatalogWarning[] = [];
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

      // Materialized catalogs (AI Ranked List, static imports) — AGENTS.md §16.3.
      if (source.staticItems && source.staticItems.length > 0) {
        const page_ = loadStaticCatalogPage(source, page);
        hasMore ||= page_.hasMore;
        const filtered = applyCatalogPolicy(page_.metas, config, source, policyOptions);
        policyWarnings.push(...filtered.warnings);
        return filtered.metas;
      }

      if (
        source.provider === 'tmdb' &&
        /^(account\.|watchlist$|favorites$|list\.)/.test(source.providerCatalogId)
      ) {
        const account = await loadAccountCatalogPage(app, config, source, page, ctx, getSecret);
        policyWarnings.push(...account.warnings);
        hasMore ||= account.hasMore;
        const filtered = applyCatalogPolicy(account.metas, config, source, policyOptions);
        policyWarnings.push(...filtered.warnings);
        return filtered.metas;
      }

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
        const detailed = await adapter.getCatalogPageDetailed(ctx, {
          providerCatalogId,
          mediaType: source.mediaType,
          page,
        });
        hasMore ||= detailed.page < detailed.totalPages;
        const mapped = detailed.items.map((item) =>
          tmdbCatalogItemToMetaPreview(
            item,
            tmdbImageUrl(item.posterPath, 'w342'),
          ),
        );
        const filtered = applyCatalogPolicy(mapped, config, source, policyOptions);
        policyWarnings.push(...filtered.warnings);
        return filtered.metas;
      }

      if (isAccountCatalogProvider(source.provider, source.providerCatalogId)) {
        const account = await loadAccountCatalogPage(app, config, source, page, ctx, getSecret);
        policyWarnings.push(...account.warnings);
        hasMore ||= account.hasMore;
        const filtered = applyCatalogPolicy(account.metas, config, source, policyOptions);
        policyWarnings.push(...filtered.warnings);
        return filtered.metas;
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
        hasMore ||= items.length >= 20;
        return items.map(
          (item): CatalogMetaPreview => ({
            id: item.publicId,
            type: item.format === 'movie' ? 'movie' : 'anime',
            name: item.name,
            poster: item.posterUrl ?? undefined,
            provider: source.provider,
            hasArtwork: Boolean(item.posterUrl),
          }),
        );
      }

      if (source.provider === 'publicmetadb') {
        const pmdbKey = await getSecret('publicmetadb');
        if (!pmdbKey) { policyWarnings.push({ code: 'SOURCE_CREDENTIAL_MISSING', params: { provider: 'publicmetadb' } }); return []; }
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
        hasMore ||= items.length >= 20;
        return items.map(
          (item): CatalogMetaPreview => ({
            id: item.publicId,
            type: item.mediaType,
            name: item.name,
            provider: 'publicmetadb',
          }),
        );
      }

      policyWarnings.push({ code: 'CATALOG_PROVIDER_UNAVAILABLE', params: { provider: source.provider } });
      return [];
    },
  );

  const filtered = applyCatalogPolicy(resolved.metas, config, catalog, policyOptions);
  return { metas: filtered.metas, hasMore, mode: resolved.mode, activeSourceId: resolved.activeSourceId, warnings: [...resolved.warnings, ...policyWarnings, ...filtered.warnings] };
}

export async function loadCatalogMetas(
  app: StremioAppContext, config: MetaLayerConfig, catalog: CatalogDefinition,
  page: number, correlationId: string, getSecret: SecretResolver,
) {
  return loadCatalogPage(app, config, catalog, page, correlationId, getSecret);
}

async function resolveBaseStremioMeta(
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

  if (type === 'anime' || /^(anilist|mal|kitsu):/.test(publicId)) {
    try {
      const match = /^(?:(anilist|mal|kitsu):)?(\d+)$/i.exec(publicId);
      const provider = match?.[1]?.toLowerCase() ?? 'anilist';
      const anilistId = match ? Number(match[2]) : null;
      if (anilistId === null) {
        return { status: 404, body: { meta: null } };
      }
      const adapter = createAppProviderAdapter(app, provider, { jikanBaseUrl: process.env.METALAYER_JIKAN_URL });
      if (!(adapter instanceof AnilistProviderAdapter) && !(adapter instanceof MalJikanProviderAdapter) && !(adapter instanceof KitsuProviderAdapter)) {
        return { status: 502, body: { meta: null } };
      }
      const anime = await adapter.getAnime(ctx, anilistId);
      const name =
        anime.titles.localized ||
        anime.titles.english ||
        anime.titles.romaji ||
        anime.titles.native ||
        anime.publicId;
      const isMovie = anime.format === 'movie';

      // Episode structure via the effective `episodeOrder` chain (AGENTS.md §10.11).
      let videos: AnimeVideo[] = [];
      if (!isMovie) {
        try {
          const resolvedCorrections =
            options.configIdForCorrections && app.correctionRegistry
              ? app.correctionRegistry
                  .listResolved(options.configIdForCorrections)
                  .filter((item) => `${item.target.provider}:${item.target.id}` === anime.publicId)
              : [];
          const order = await resolveAnimeEpisodeOrder(app, config, {
            provider: provider as 'anilist' | 'mal' | 'kitsu',
            id: anilistId,
            anime,
            ctx,
            corrections: resolvedCorrections,
          });
          videos = order.videos;
        } catch {
          videos = [];
        }
      }

      return {
        status: 200,
        body: {
          meta: {
            id: anime.publicId,
            type: isMovie ? ('movie' as const) : ('series' as const),
            name,
            poster: anime.posterUrl ?? undefined,
            description: anime.description,
            imdbRating:
              anime.averageScore !== undefined
                ? anime.averageScore.toFixed(1)
                : undefined,
            ...(isMovie
              ? {}
              : {
                  videos,
                  behaviorHints: { hasScheduledVideos: videos.length > 0 },
                }),
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

/** Resolve public metadata through the same field engine as the Inspector. */
export async function resolveStremioMeta(
  app: StremioAppContext,
  config: MetaLayerConfig,
  type: 'movie' | 'series' | 'anime',
  publicId: string,
  correlationId: string,
  getSecret: SecretResolver,
  options: { configIdForCorrections?: string } = {},
): Promise<{ status: 200; body: { meta: Record<string, unknown> } } | { status: 404 | 502; body: { meta: null } }> {
  const base = await resolveBaseStremioMeta(app, config, type, publicId, correlationId, getSecret, options);
  if (base.status !== 200) return base;
  let meta = base.body.meta;
  const anime = type === 'anime' || /^(anilist|mal|kitsu):/.test(publicId);
  let ids: { imdb?: string; tmdb?: string | number } = {};
  if (!anime) {
    try {
      const live = await gatherLiveBag(app, config, { id: publicId, mediaType: type, correlationId, getSecret });
      const fields = resolveMetadata(live.bag, {
        fieldProviders: config.fieldProviders,
        resolution: config.resolution,
        localization: config.localization,
        mediaType: type,
        originalLanguage: live.originalLanguage,
      });
      ids = fields.externalIds.value ?? {};
      // Do not silently put TMDB back when a user explicitly excludes it.
      meta = {
        ...meta,
        name: fields.displayTitle ?? String(meta.id),
        description: fields.displayDescription ?? undefined,
        poster: fields.poster.value ?? undefined,
        background: fields.background.value ?? undefined,
        logo: fields.logo.value ?? undefined,
        imdbRating: fields.rating.value?.toFixed(1),
        releaseInfo: fields.releaseDate.value ?? undefined,
      };
    } catch {
      return { status: 502, body: { meta: null } };
    }
  }
  const corrections = options.configIdForCorrections && app.correctionRegistry
    ? app.correctionRegistry.listResolved(options.configIdForCorrections) : [];
  const applicable = anime
    ? corrections.filter(item => `${item.target.provider}:${item.target.id}` === publicId)
    : filterCorrectionsForIdentity(corrections, ids);
  const corrected = applyMetadataCorrections({ ...meta, title: meta.name, releaseDate: meta.releaseInfo }, applicable);
  if (corrected.hidden) return { status: 404, body: { meta: null } };
  meta = { ...corrected.value, name: corrected.value.title, releaseInfo: corrected.value.releaseDate };
  delete meta.title;
  delete meta.releaseDate;
  return { status: 200, body: { meta: applyPresentation(meta, config.presentation, config.localization).meta } };
}

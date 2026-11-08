import {
  normalizeImdbId,
  parsePublicId,
  selectStremioPublicId,
  type StremioPublicIdPreference,
} from '@metalayer/identity';
import { classifyHttpStatus, ProviderError } from '../core/errors.js';
import { buildProviderCacheKey } from '../core/cache-key.js';
import type { ProviderCacheStore } from '../core/provider-cache.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  withRetry,
  type ProviderAdapter,
  type ProviderContext,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from '../core/runtime.js';
import { tmdbLocaleAdapter } from '../locale/tmdb.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';

export interface TmdbMovieSummary {
  id: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number;
  originalLanguage?: string;
  imdbId?: string;
  /** Public Stremio id — IMDb by default when known (ADR 0006). */
  publicId: string;
}

export interface TmdbSeriesSummary {
  id: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  firstAirDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number;
  originalLanguage?: string;
  imdbId?: string;
  numberOfSeasons?: number;
  seasons?: TmdbSeasonSummary[];
  /** Public Stremio id — IMDb by default when known (ADR 0006). */
  publicId: string;
}

export interface TmdbSeasonSummary {
  seasonNumber: number;
  episodeCount?: number;
  name?: string;
  airDate?: string;
}

export interface TmdbEpisodeSummary {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  stillPath?: string | null;
  runtime?: number;
  voteAverage?: number;
}

export interface TmdbCatalogItem {
  popularity?: number;
  originalTitle?: string;
  id: number;
  name: string;
  mediaType: 'movie' | 'series' | 'anime';
  posterPath?: string | null;
  releaseDate?: string;
  publicId: string;
  adult?: boolean;
  genreIds?: number[];
  overview?: string;
  voteAverage?: number;
  voteCount?: number;
  originalLanguage?: string;
}

export type TmdbFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface TmdbAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: TmdbFetch;
  policy?: Partial<ProviderHttpPolicy>;
  cache?: ProviderCacheStore;
  /** Default 15 minutes. */
  cacheTtlMs?: number;
  /** ADR 0006 — default public Stremio id strategy. */
  stremioPublicId?: StremioPublicIdPreference;
  /** Shared circuit-breaker tracker when provided by the app registry. */
  health?: ProviderHealthTracker;
}

export class TmdbProviderAdapter implements ProviderAdapter {
  readonly id = 'tmdb';
  readonly locale: ProviderLocaleAdapter = tmdbLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly defaultApiKey?: string;
  private readonly fetchImpl: TmdbFetch;
  private readonly health: ProviderHealthTracker;
  private readonly cache?: ProviderCacheStore;
  private readonly cacheTtlMs: number;
  private readonly stremioPublicId: StremioPublicIdPreference;
  lastCacheStatus: 'hit' | 'miss' | 'stale' | 'bypass' = 'bypass';

  constructor(options: TmdbAdapterOptions = {}) {
    const definition = getProvider('tmdb');
    if (!definition) {
      throw new Error('TMDB is missing from PROVIDER_REGISTRY');
    }
    this.definition = definition;
    this.baseUrl = options.baseUrl ?? 'https://api.themoviedb.org/3';
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.cache = options.cache;
    this.cacheTtlMs = options.cacheTtlMs ?? 15 * 60_000;
    this.stremioPublicId = options.stremioPublicId ?? 'imdb';
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    await this.requestJson<{ images?: unknown }>(ctx, '/configuration');
    return this.getHealth();
  }

  async getMovie(
    ctx: ProviderContext,
    movieId: number,
  ): Promise<TmdbMovieSummary> {
    return this.withCache(ctx, 'movie', String(movieId), async () => {
      const raw = await this.requestJson<Record<string, unknown>>(
        ctx,
        `/movie/${movieId}`,
        { append_to_response: 'external_ids' },
      );
      return mapMovie(raw, this.stremioPublicId);
    });
  }

  /**
   * Resolve a movie by public Stremio id (`tt…`, `tmdb:123`, or bare TMDB id).
   */
  async getMovieByPublicId(
    ctx: ProviderContext,
    publicId: string,
  ): Promise<TmdbMovieSummary> {
    const parsed = parsePublicId(publicId);
    if (parsed.kind === 'imdb' && parsed.imdbId) {
      const tmdbId = await this.findTmdbIdByImdb(ctx, parsed.imdbId, 'movie');
      return this.getMovie(ctx, tmdbId);
    }
    if (parsed.kind === 'tmdb' && parsed.tmdbId) {
      return this.getMovie(ctx, Number(parsed.tmdbId));
    }
    throw new ProviderError({
      code: 'validation',
      providerId: this.id,
      message: `Unsupported public id: ${publicId}`,
      retryable: false,
    });
  }

  async getSeries(
    ctx: ProviderContext,
    seriesId: number,
  ): Promise<TmdbSeriesSummary> {
    return this.withCache(ctx, 'tv', String(seriesId), async () => {
      const raw = await this.requestJson<Record<string, unknown>>(
        ctx,
        `/tv/${seriesId}`,
        { append_to_response: 'external_ids' },
      );
      return mapSeries(raw, this.stremioPublicId);
    });
  }

  /**
   * Resolve a series by public Stremio id (`tt…`, `tmdb:123`, or bare TMDB id).
   */
  async getSeriesByPublicId(
    ctx: ProviderContext,
    publicId: string,
  ): Promise<TmdbSeriesSummary> {
    const parsed = parsePublicId(publicId);
    if (parsed.kind === 'imdb' && parsed.imdbId) {
      const tmdbId = await this.findTmdbIdByImdb(ctx, parsed.imdbId, 'series');
      return this.getSeries(ctx, tmdbId);
    }
    if (parsed.kind === 'tmdb' && parsed.tmdbId) {
      return this.getSeries(ctx, Number(parsed.tmdbId));
    }
    throw new ProviderError({
      code: 'validation',
      providerId: this.id,
      message: `Unsupported public id: ${publicId}`,
      retryable: false,
    });
  }

  async getSeasonEpisodes(
    ctx: ProviderContext,
    seriesId: number,
    seasonNumber: number,
  ): Promise<TmdbEpisodeSummary[]> {
    return this.withCache(
      ctx,
      'tv-season',
      `${seriesId}:${seasonNumber}`,
      async () => {
        const raw = await this.requestJson<{
          episodes?: Array<Record<string, unknown>>;
          season_number?: number;
        }>(ctx, `/tv/${seriesId}/season/${seasonNumber}`);
        const season =
          typeof raw.season_number === 'number'
            ? raw.season_number
            : seasonNumber;
        return (raw.episodes ?? []).map((episode) =>
          mapEpisode(episode, season),
        );
      },
    );
  }

  async getEpisodeGroup(ctx: ProviderContext, groupId: string): Promise<TmdbEpisodeSummary[]> {
    return this.withCache(ctx, 'tv-episode-group', groupId, async () => {
      const raw = await this.requestJson<{
        groups?: Array<{ order: number; episodes: Array<Record<string, unknown>> }>;
      }>(ctx, `/tv/episode_group/${groupId}`);
      return (raw.groups ?? [])
        .filter((group) => Number.isSafeInteger(group.order) && Array.isArray(group.episodes))
        .sort((a, b) => a.order - b.order)
        .flatMap((group) => group.episodes.map((episode, index) =>
          mapEpisode({ ...episode, episode_number: index + 1 }, group.order),
        ));
    });
  }

  /**
   * Load regular-season episodes (skips season 0 specials). Caps concurrency
   * for very long-running shows.
   */
  async getSeriesEpisodes(
    ctx: ProviderContext,
    series: TmdbSeriesSummary,
    options: { maxSeasons?: number; includeSpecials?: boolean } = {},
  ): Promise<TmdbEpisodeSummary[]> {
    const maxSeasons = options.maxSeasons ?? 40;
    const minSeason = options.includeSpecials ? 0 : 1;
    const seasonNumbers = (series.seasons ?? [])
      .map((season) => season.seasonNumber)
      .filter((number) => number >= minSeason)
      .sort((a, b) => a - b)
      .slice(0, maxSeasons);

    if (seasonNumbers.length === 0 && series.numberOfSeasons) {
      const start = minSeason;
      for (
        let n = start;
        n <= Math.min(series.numberOfSeasons, maxSeasons);
        n += 1
      ) {
        seasonNumbers.push(n);
      }
    }

    const episodes: TmdbEpisodeSummary[] = [];
    const batchSize = 5;
    for (let i = 0; i < seasonNumbers.length; i += batchSize) {
      const batch = seasonNumbers.slice(i, i + batchSize);
      const pages = await Promise.all(
        batch.map((seasonNumber) =>
          this.getSeasonEpisodes(ctx, series.id, seasonNumber),
        ),
      );
      for (const page of pages) episodes.push(...page);
    }
    return episodes;
  }

  async findTmdbIdByImdb(
    ctx: ProviderContext,
    imdbId: string,
    mediaType: 'movie' | 'series' = 'movie',
  ): Promise<number> {
    const normalized = normalizeImdbId(imdbId);
    if (!normalized) {
      throw new ProviderError({
        code: 'validation',
        providerId: this.id,
        message: `Invalid IMDb id: ${imdbId}`,
        retryable: false,
      });
    }

    return this.withCache(ctx, 'find-imdb', `${mediaType}:${normalized}`, async () => {
      const raw = await this.requestJson<{
        movie_results?: Array<{ id?: number }>;
        tv_results?: Array<{ id?: number }>;
      }>(ctx, `/find/${normalized}`, { external_source: 'imdb_id' });

      const results =
        mediaType === 'series' ? raw.tv_results : raw.movie_results;
      const id = results?.[0]?.id;
      if (!id) {
        throw new ProviderError({
          code: 'not_found',
          providerId: this.id,
          message: `No TMDB ${mediaType} found for ${normalized}`,
          retryable: false,
        });
      }
      return id;
    });
  }

  async searchMovies(
    ctx: ProviderContext,
    query: string,
    page = 1,
  ): Promise<TmdbMovieSummary[]> {
    return this.withCache(
      ctx,
      'search-movie',
      `${query.toLowerCase()}#${page}`,
      async () => {
        const raw = await this.requestJson<{
          results?: Array<Record<string, unknown>>;
        }>(ctx, '/search/movie', {
          query,
          page: String(page),
        });
        return (raw.results ?? []).map((item) =>
          mapMovie(item, this.stremioPublicId),
        );
      },
    );
  }

  async searchSeries(
    ctx: ProviderContext,
    query: string,
    page = 1,
  ): Promise<TmdbSeriesSummary[]> {
    return this.withCache(
      ctx,
      'search-tv',
      `${query.toLowerCase()}#${page}`,
      async () => {
        const raw = await this.requestJson<{
          results?: Array<Record<string, unknown>>;
        }>(ctx, '/search/tv', {
          query,
          page: String(page),
        });
        return (raw.results ?? []).map((item) =>
          mapSeries(item, this.stremioPublicId),
        );
      },
    );
  }

  /**
   * Text search returning lightweight catalog cards (genres, rating, votes)
   * so search-scoped rules can run without per-card metadata calls.
   */
  async searchCatalogItems(
    ctx: ProviderContext,
    input: { query: string; mediaType: 'movie' | 'series'; page?: number },
  ): Promise<{ items: TmdbCatalogItem[]; totalPages: number }> {
    const page = input.page ?? 1;
    const tmdbType = input.mediaType === 'movie' ? 'movie' : 'tv';
    return this.withCache(
      ctx,
      'search-catalog',
      `${tmdbType}:${input.query.toLowerCase()}#${page}`,
      async () => {
        const raw = await this.requestJson<{
          results?: Array<Record<string, unknown>>;
          total_pages?: number;
        }>(ctx, `/search/${tmdbType}`, {
          query: input.query,
          page: String(page),
          include_adult: 'false',
        });
        return {
          items: (raw.results ?? []).map((item) =>
            mapCatalogItem(item, input.mediaType, this.stremioPublicId),
          ),
          totalPages:
            typeof raw.total_pages === 'number' ? raw.total_pages : page,
        };
      },
    );
  }

  /**
   * Lightweight catalog page for Studio preview (trending/popular/top_rated/…).
   */
  async getCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
    },
  ): Promise<TmdbCatalogItem[]> {
    return (await this.getCatalogPageDetailed(ctx, input)).items;
  }

  /** Catalog page with upstream pagination facts so callers do not guess `hasMore`. */
  async getCatalogPageDetailed(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
    },
  ): Promise<{ items: TmdbCatalogItem[]; totalPages: number; page: number }> {
    const page = input.page ?? 1;
    const tmdbType = input.mediaType === 'movie' ? 'movie' : 'tv';
    const path = resolveCatalogPath(input.providerCatalogId, tmdbType);

    return this.withCache(
      ctx,
      'catalog-page-v2',
      `${tmdbType}:${input.providerCatalogId}#${page}`,
      async () => {
        const raw = await this.requestJson<{
          results?: Array<Record<string, unknown>>;
          total_pages?: number;
        }>(ctx, path, { page: String(page) });
        const items = (raw.results ?? []).map((item) =>
          mapCatalogItem(item, input.mediaType, this.stremioPublicId),
        );
        // TMDB caps list pagination at 500 pages.
        const totalPages =
          typeof raw.total_pages === 'number' && raw.total_pages > 0
            ? Math.min(raw.total_pages, 500)
            : items.length >= 20
              ? page + 1
              : page;
        return { items, totalPages, page };
      },
    );
  }

  /**
   * TMDB account catalogs (AGENTS.md §8.2 "TMDB account lists").
   * `providerCatalogId`: `account.watchlist`, `account.favorites`,
   * `account.list.{listId}` (legacy aliases `watchlist`, `favorites`, `list.{id}`).
   * Account responses are never cached: they are personal and session-scoped.
   */
  async getAccountCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
      sessionId: string;
    },
  ): Promise<{ items: TmdbCatalogItem[]; totalPages: number; page: number }> {
    if (input.mediaType === 'anime') return { items: [], totalPages: 0, page: 1 };
    const page = input.page ?? 1;
    const tmdbType = input.mediaType === 'movie' ? 'movie' : 'tv';
    const catalogId = input.providerCatalogId.replace(/^account\./, '');
    const sessionQuery = { session_id: input.sessionId, page: String(page) };

    if (catalogId === 'watchlist' || catalogId === 'favorites') {
      const account = await this.requestJson<{ id?: number }>(ctx, '/account', {
        session_id: input.sessionId,
      });
      if (typeof account.id !== 'number') {
        throw new ProviderError({
          code: 'auth',
          providerId: this.id,
          message: 'TMDB session did not resolve an account id',
          retryable: false,
        });
      }
      const segment = catalogId === 'watchlist' ? 'watchlist' : 'favorite';
      const raw = await this.requestJson<{
        results?: Array<Record<string, unknown>>;
        total_pages?: number;
      }>(ctx, `/account/${account.id}/${segment}/${tmdbType}`, {
        ...sessionQuery,
        sort_by: 'created_at.desc',
      });
      return {
        items: (raw.results ?? []).map((item) =>
          mapCatalogItem(item, input.mediaType, this.stremioPublicId),
        ),
        totalPages: typeof raw.total_pages === 'number' ? raw.total_pages : page,
        page,
      };
    }

    if (catalogId.startsWith('list.')) {
      const listId = encodeURIComponent(catalogId.slice('list.'.length));
      // v3 lists are unpaginated and mixed; filter by media_type client-side.
      const raw = await this.requestJson<{
        items?: Array<Record<string, unknown>>;
      }>(ctx, `/list/${listId}`, { session_id: input.sessionId });
      const matching = (raw.items ?? []).filter(
        (item) => item.media_type === tmdbType,
      );
      const start = (page - 1) * 20;
      return {
        items: matching
          .slice(start, start + 20)
          .map((item) => mapCatalogItem(item, input.mediaType, this.stremioPublicId)),
        totalPages: Math.max(1, Math.ceil(matching.length / 20)),
        page,
      };
    }

    throw new ProviderError({
      code: 'unsupported',
      providerId: this.id,
      message: `TMDB account catalog ${input.providerCatalogId} is not supported`,
      retryable: false,
    });
  }

  /** Created lists of the session account (Studio source picker). */
  async getAccountLists(
    ctx: ProviderContext,
    sessionId: string,
  ): Promise<Array<{ id: number; name: string; itemCount?: number }>> {
    const account = await this.requestJson<{ id?: number }>(ctx, '/account', {
      session_id: sessionId,
    });
    if (typeof account.id !== 'number') return [];
    const raw = await this.requestJson<{
      results?: Array<{ id?: number; name?: string; item_count?: number }>;
    }>(ctx, `/account/${account.id}/lists`, { session_id: sessionId });
    return (raw.results ?? [])
      .filter((list) => typeof list.id === 'number')
      .map((list) => ({
        id: list.id!,
        name: list.name ?? `List ${list.id}`,
        itemCount: list.item_count,
      }));
  }

  private async withCache<T>(
    ctx: ProviderContext,
    operation: string,
    identity: string,
    load: () => Promise<T>,
  ): Promise<T> {
    const fallbackChain = this.locale.getFallbacks(ctx.locale ?? 'en-US');
    const key = buildProviderCacheKey({
      providerId: this.id,
      operation,
      identity,
      locale: ctx.locale,
      region: ctx.region,
      fallbackChain,
    });

    if (!this.cache) {
      this.lastCacheStatus = 'bypass';
      return load();
    }

    const existing = await this.cache.get<T>(key);
    if (existing) {
      this.lastCacheStatus = existing.status;
      return existing.entry.value;
    }

    const value = await load();
    await this.cache.set(key, value, {
      ttlMs: this.cacheTtlMs,
      source: this.id,
      degraded: false,
      staleEligible: true,
    });
    this.lastCacheStatus = 'miss';
    return value;
  }

  private resolveApiKey(ctx: ProviderContext): string {
    const apiKey = ctx.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'TMDB API key is missing',
        retryable: false,
      });
    }
    return apiKey;
  }

  private async requestJson<T>(
    ctx: ProviderContext,
    path: string,
    query: Record<string, string> = {},
  ): Promise<T> {
    const apiKey = this.resolveApiKey(ctx);
    const locale = this.locale.toProviderLocale({
      locale: ctx.locale ?? 'en-US',
      region: ctx.region,
    });

    const params = new URLSearchParams({
      api_key: apiKey,
      ...query,
    });
    if (locale.language) params.set('language', locale.language);
    if (locale.region) params.set('region', locale.region);

    const url = `${this.baseUrl}${path}?${params.toString()}`;

    return withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          signal,
          headers: {
            Accept: 'application/json',
            'X-Correlation-Id': ctx.correlationId,
          },
        });

        if (!response.ok) {
          throw classifyHttpStatus(response.status, this.id);
        }

        return (await response.json()) as T;
      },
    });
  }
}

function mapMovie(
  raw: Record<string, unknown>,
  preference: StremioPublicIdPreference = 'imdb',
): TmdbMovieSummary {
  const externalIds =
    raw.external_ids && typeof raw.external_ids === 'object'
      ? (raw.external_ids as Record<string, unknown>)
      : undefined;
  const imdbId = normalizeImdbId(
    (typeof raw.imdb_id === 'string' ? raw.imdb_id : undefined) ||
      (typeof externalIds?.imdb_id === 'string' ? externalIds.imdb_id : undefined),
  );
  const tmdbId = Number(raw.id);

  return {
    id: tmdbId,
    title: String(raw.title ?? ''),
    originalTitle:
      typeof raw.original_title === 'string' ? raw.original_title : undefined,
    overview: typeof raw.overview === 'string' ? raw.overview : undefined,
    releaseDate:
      typeof raw.release_date === 'string' ? raw.release_date : undefined,
    posterPath:
      typeof raw.poster_path === 'string' || raw.poster_path === null
        ? (raw.poster_path as string | null)
        : undefined,
    backdropPath:
      typeof raw.backdrop_path === 'string' || raw.backdrop_path === null
        ? (raw.backdrop_path as string | null)
        : undefined,
    voteAverage:
      typeof raw.vote_average === 'number' ? raw.vote_average : undefined,
    originalLanguage:
      typeof raw.original_language === 'string'
        ? raw.original_language
        : undefined,
    imdbId: imdbId ?? undefined,
    publicId:
      selectStremioPublicId({
        imdbId,
        tmdbId,
        preference,
      }) ?? `tmdb:${tmdbId}`,
  };
}

function mapSeries(
  raw: Record<string, unknown>,
  preference: StremioPublicIdPreference = 'imdb',
): TmdbSeriesSummary {
  const externalIds =
    raw.external_ids && typeof raw.external_ids === 'object'
      ? (raw.external_ids as Record<string, unknown>)
      : undefined;
  const imdbId = normalizeImdbId(
    typeof externalIds?.imdb_id === 'string' ? externalIds.imdb_id : undefined,
  );
  const tmdbId = Number(raw.id);

  return {
    id: tmdbId,
    title: String(raw.name ?? ''),
    originalTitle:
      typeof raw.original_name === 'string' ? raw.original_name : undefined,
    overview: typeof raw.overview === 'string' ? raw.overview : undefined,
    firstAirDate:
      typeof raw.first_air_date === 'string' ? raw.first_air_date : undefined,
    posterPath:
      typeof raw.poster_path === 'string' || raw.poster_path === null
        ? (raw.poster_path as string | null)
        : undefined,
    backdropPath:
      typeof raw.backdrop_path === 'string' || raw.backdrop_path === null
        ? (raw.backdrop_path as string | null)
        : undefined,
    voteAverage:
      typeof raw.vote_average === 'number' ? raw.vote_average : undefined,
    originalLanguage:
      typeof raw.original_language === 'string'
        ? raw.original_language
        : undefined,
    imdbId: imdbId ?? undefined,
    numberOfSeasons:
      typeof raw.number_of_seasons === 'number'
        ? raw.number_of_seasons
        : undefined,
    seasons: Array.isArray(raw.seasons)
      ? raw.seasons
          .map((item) => mapSeason(item as Record<string, unknown>))
          .filter((season): season is TmdbSeasonSummary => season !== null)
      : undefined,
    publicId:
      selectStremioPublicId({
        imdbId,
        tmdbId,
        preference,
      }) ?? `tmdb:${tmdbId}`,
  };
}

function mapSeason(raw: Record<string, unknown>): TmdbSeasonSummary | null {
  const seasonNumber =
    typeof raw.season_number === 'number' ? raw.season_number : null;
  if (seasonNumber === null) return null;
  return {
    seasonNumber,
    episodeCount:
      typeof raw.episode_count === 'number' ? raw.episode_count : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    airDate: typeof raw.air_date === 'string' ? raw.air_date : undefined,
  };
}

function mapEpisode(
  raw: Record<string, unknown>,
  seasonNumber: number,
): TmdbEpisodeSummary {
  return {
    seasonNumber,
    episodeNumber:
      typeof raw.episode_number === 'number' ? raw.episode_number : 0,
    name: String(raw.name ?? ''),
    overview: typeof raw.overview === 'string' ? raw.overview : undefined,
    airDate: typeof raw.air_date === 'string' ? raw.air_date : undefined,
    stillPath:
      typeof raw.still_path === 'string' || raw.still_path === null
        ? (raw.still_path as string | null)
        : undefined,
    runtime: typeof raw.runtime === 'number' ? raw.runtime : undefined,
    voteAverage:
      typeof raw.vote_average === 'number' ? raw.vote_average : undefined,
  };
}

function resolveCatalogPath(
  providerCatalogId: string,
  tmdbType: 'movie' | 'tv',
): string {
  switch (providerCatalogId) {
    case 'trending':
      return `/trending/${tmdbType}/week`;
    case 'popular':
      return `/${tmdbType}/popular`;
    case 'top_rated':
      return `/${tmdbType}/top_rated`;
    case 'upcoming':
      return tmdbType === 'movie' ? '/movie/upcoming' : '/tv/on_the_air';
    case 'now_playing':
      return tmdbType === 'movie' ? '/movie/now_playing' : '/tv/airing_today';
    default:
      return `/${tmdbType}/popular`;
  }
}

function mapCatalogItem(
  raw: Record<string, unknown>,
  mediaType: 'movie' | 'series' | 'anime',
  preference: StremioPublicIdPreference,
): TmdbCatalogItem {
  const tmdbId = Number(raw.id);
  const name = String(raw.title ?? raw.name ?? '');
  const releaseDate =
    typeof raw.release_date === 'string'
      ? raw.release_date
      : typeof raw.first_air_date === 'string'
        ? raw.first_air_date
        : undefined;
  const genreIds = Array.isArray(raw.genre_ids)
    ? raw.genre_ids
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : undefined;

  return {
    id: tmdbId,
    name,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : undefined,
    originalTitle: typeof (raw.original_title ?? raw.original_name) === 'string' ? String(raw.original_title ?? raw.original_name) : undefined,
    mediaType,
    posterPath:
      typeof raw.poster_path === 'string' || raw.poster_path === null
        ? (raw.poster_path as string | null)
        : undefined,
    releaseDate,
    publicId:
      selectStremioPublicId({
        tmdbId,
        preference,
      }) ?? `tmdb:${tmdbId}`,
    adult: typeof raw.adult === 'boolean' ? raw.adult : undefined,
    genreIds,
    overview: typeof raw.overview === 'string' ? raw.overview : undefined,
    voteAverage:
      typeof raw.vote_average === 'number' ? raw.vote_average : undefined,
    voteCount: typeof raw.vote_count === 'number' ? raw.vote_count : undefined,
    originalLanguage:
      typeof raw.original_language === 'string'
        ? raw.original_language
        : undefined,
  };
}

import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);
const {
  normalizeImdbId,
  parsePublicId,
  selectStremioPublicId,
} = require('@metalayer/identity') as typeof import('@metalayer/identity');
type StremioPublicIdPreference = import('@metalayer/identity').StremioPublicIdPreference;

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

export interface TmdbCatalogItem {
  id: number;
  name: string;
  mediaType: 'movie' | 'series' | 'anime';
  posterPath?: string | null;
  releaseDate?: string;
  publicId: string;
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
    this.health = new ProviderHealthTracker(this.policy);
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
    const page = input.page ?? 1;
    const tmdbType = input.mediaType === 'movie' ? 'movie' : 'tv';
    const path = resolveCatalogPath(input.providerCatalogId, tmdbType);

    return this.withCache(
      ctx,
      'catalog-page',
      `${tmdbType}:${input.providerCatalogId}#${page}`,
      async () => {
        const raw = await this.requestJson<{
          results?: Array<Record<string, unknown>>;
        }>(ctx, path, { page: String(page) });
        return (raw.results ?? []).map((item) =>
          mapCatalogItem(item, input.mediaType, this.stremioPublicId),
        );
      },
    );
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

    const existing = this.cache.get<T>(key);
    if (existing) {
      this.lastCacheStatus = existing.status;
      return existing.entry.value;
    }

    const value = await load();
    this.cache.set(key, value, {
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

  return {
    id: tmdbId,
    name,
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
  };
}

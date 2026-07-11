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
      );
      return mapMovie(raw);
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
        return (raw.results ?? []).map(mapMovie);
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

function mapMovie(raw: Record<string, unknown>): TmdbMovieSummary {
  return {
    id: Number(raw.id),
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
  };
}

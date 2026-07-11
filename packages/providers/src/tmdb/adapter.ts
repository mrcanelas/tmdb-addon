import { classifyHttpStatus, ProviderError } from '../core/errors.js';
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
    const raw = await this.requestJson<Record<string, unknown>>(
      ctx,
      `/movie/${movieId}`,
    );
    return mapMovie(raw);
  }

  async searchMovies(
    ctx: ProviderContext,
    query: string,
    page = 1,
  ): Promise<TmdbMovieSummary[]> {
    const raw = await this.requestJson<{ results?: Array<Record<string, unknown>> }>(
      ctx,
      '/search/movie',
      {
        query,
        page: String(page),
      },
    );
    return (raw.results ?? []).map(mapMovie);
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

import { normalizeImdbId } from '@metalayer/identity';
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
import { unsupportedLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';
import type { ProviderFetch } from '../artwork/types.js';

export type ImdbMediaType = 'movie' | 'series';

export interface ImdbEpisodeSummary {
  id: string;
  name?: string;
  season?: number;
  episode?: number;
  released?: string;
  thumbnail?: string;
}

/**
 * Normalized Cinemeta /meta payload used as the IMDb metadata source.
 * Cinemeta is typically English-only (no locale negotiation).
 */
export interface ImdbMeta {
  imdbId: string;
  mediaType: ImdbMediaType;
  title?: string;
  /** Cinemeta rarely exposes a distinct original title; may equal title. */
  originalTitle?: string;
  description?: string;
  poster?: string;
  background?: string;
  logo?: string;
  /** Numeric IMDb rating when parseable (e.g. 8.8). */
  rating?: number;
  ratingRaw?: string;
  releaseDate?: string;
  /** Calendar year string when a full date is unavailable (e.g. "2026"). */
  releaseYear?: string;
  runtimeMinutes?: number;
  runtimeRaw?: string;
  genres?: string[];
  cast?: string[];
  directors?: string[];
  writers?: string[];
  trailers?: Array<{ source: string; type?: string }>;
  episodes?: ImdbEpisodeSummary[];
  externalIds: {
    imdb: string;
    tmdb?: number;
  };
  source: 'cinemeta';
}

/** @deprecated Prefer ImdbMeta — kept for preview/rating callers. */
export interface ImdbRating {
  imdbId: string;
  mediaType: ImdbMediaType;
  rating?: number;
  ratingRaw?: string;
  source: 'cinemeta';
}

export interface ImdbProviderAdapterOptions {
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  cache?: ProviderCacheStore;
  cacheTtlMs?: number;
  health?: ProviderHealthTracker;
}

/** @deprecated Use ImdbProviderAdapterOptions */
export type ImdbRatingsAdapterOptions = ImdbProviderAdapterOptions;

type CinemetaVideo = {
  id?: string;
  title?: string;
  name?: string;
  season?: number;
  episode?: number;
  released?: string;
  thumbnail?: string;
};

type CinemetaMetaBody = {
  meta?: {
    id?: string;
    imdb_id?: string;
    name?: string;
    description?: string;
    poster?: string;
    background?: string;
    logo?: string;
    imdbRating?: string | number;
    released?: string;
    releaseInfo?: string;
    year?: string | number;
    runtime?: string;
    genre?: string[];
    genres?: string[];
    cast?: string[];
    director?: string | string[];
    writer?: string | string[];
    trailers?: Array<{ source?: string; type?: string }>;
    videos?: CinemetaVideo[];
    moviedb_id?: number;
  };
};

function asStringList(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => item.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  const trimmed = value.trim();
  return trimmed ? [trimmed] : undefined;
}

function parseRuntimeMinutes(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d+)\s*min/i);
  if (!match) return undefined;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : undefined;
}

function parseCinemetaMeta(
  body: CinemetaMetaBody,
  imdbId: string,
  mediaType: ImdbMediaType,
): ImdbMeta {
  const meta = body.meta ?? {};
  const ratingRaw =
    meta.imdbRating !== undefined && meta.imdbRating !== null
      ? String(meta.imdbRating)
      : undefined;
  const rating =
    ratingRaw !== undefined && ratingRaw !== '' && !Number.isNaN(Number(ratingRaw))
      ? Number(ratingRaw)
      : undefined;

  const genres = meta.genres ?? meta.genre;
  const directors = asStringList(meta.director);
  const writers = asStringList(meta.writer);
  const runtimeRaw = meta.runtime?.trim() || undefined;
  const releaseYear =
    meta.year !== undefined && meta.year !== null
      ? String(meta.year)
      : meta.releaseInfo?.trim() || undefined;

  const episodes =
    mediaType === 'series' && Array.isArray(meta.videos)
      ? meta.videos
          .filter((video) => video.id || video.episode !== undefined)
          .map((video) => ({
            id: video.id ?? `${imdbId}:${video.season ?? 0}:${video.episode ?? 0}`,
            name: video.name ?? video.title,
            season: video.season,
            episode: video.episode,
            released: video.released,
            thumbnail: video.thumbnail,
          }))
      : undefined;

  return {
    imdbId,
    mediaType,
    title: meta.name?.trim() || undefined,
    originalTitle: meta.name?.trim() || undefined,
    description: meta.description?.trim() || undefined,
    poster: meta.poster?.trim() || undefined,
    background: meta.background?.trim() || undefined,
    logo: meta.logo?.trim() || undefined,
    rating,
    ratingRaw,
    releaseDate: meta.released?.trim() || undefined,
    releaseYear,
    runtimeMinutes: parseRuntimeMinutes(runtimeRaw),
    runtimeRaw,
    genres: genres?.map((item) => item.trim()).filter(Boolean),
    cast: meta.cast?.map((item) => item.trim()).filter(Boolean),
    directors,
    writers,
    trailers: meta.trailers
      ?.filter((trailer) => trailer.source)
      .map((trailer) => ({
        source: String(trailer.source),
        type: trailer.type,
      })),
    episodes: episodes && episodes.length > 0 ? episodes : undefined,
    externalIds: {
      imdb: imdbId,
      tmdb: meta.moviedb_id,
    },
    source: 'cinemeta',
  };
}

/**
 * IMDb metadata adapter via the public Cinemeta Stremio meta endpoint.
 * Supplies full meta fields (title, artwork, credits, rating, …) without credentials.
 */
export class ImdbProviderAdapter implements ProviderAdapter {
  readonly id = 'imdb';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly cache?: ProviderCacheStore;
  private readonly cacheTtlMs: number;
  lastCacheStatus: 'hit' | 'miss' | 'stale' | 'bypass' = 'bypass';

  constructor(options: ImdbProviderAdapterOptions = {}) {
    const definition = getProvider('imdb');
    if (!definition) {
      throw new Error('IMDb is missing from PROVIDER_REGISTRY');
    }
    this.definition = definition;
    this.baseUrl = (
      options.baseUrl ?? 'https://v3-cinemeta.strem.io'
    ).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.cache = options.cache;
    this.cacheTtlMs = options.cacheTtlMs ?? 6 * 60 * 60_000;
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    await this.getMeta(ctx, 'tt0137523', 'movie');
    return this.getHealth();
  }

  async getMeta(
    ctx: ProviderContext,
    imdbId: string,
    mediaType: ImdbMediaType = 'movie',
  ): Promise<ImdbMeta> {
    const normalized = normalizeImdbId(imdbId);
    if (!normalized) {
      throw new ProviderError({
        code: 'validation',
        providerId: this.id,
        message: `Invalid IMDb id: ${imdbId}`,
        retryable: false,
      });
    }

    const key = buildProviderCacheKey({
      providerId: this.id,
      operation: 'meta',
      identity: `${mediaType}:${normalized}`,
    });

    if (this.cache) {
      const existing = await this.cache.get<ImdbMeta>(key);
      if (existing) {
        this.lastCacheStatus = existing.status;
        return existing.entry.value;
      }
    } else {
      this.lastCacheStatus = 'bypass';
    }

    const value = await withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const url = `${this.baseUrl}/meta/${mediaType}/${normalized}.json`;
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
        const body = (await response.json()) as CinemetaMetaBody;
        if (!body.meta) {
          throw new ProviderError({
            code: 'not_found',
            providerId: this.id,
            message: `Cinemeta meta missing for ${normalized}`,
            retryable: false,
          });
        }
        return parseCinemetaMeta(body, normalized, mediaType);
      },
    });

    await this.cache?.set(key, value, {
      ttlMs: this.cacheTtlMs,
      source: this.id,
      degraded: !value.title && value.rating === undefined,
      staleEligible: Boolean(value.title || value.rating !== undefined),
    });
    this.lastCacheStatus = this.cache ? 'miss' : 'bypass';
    return value;
  }

  /** Compatibility helper for rating-only callers (preview / legacy). */
  async getRating(
    ctx: ProviderContext,
    imdbId: string,
    mediaType: ImdbMediaType = 'movie',
  ): Promise<ImdbRating> {
    const meta = await this.getMeta(ctx, imdbId, mediaType);
    return {
      imdbId: meta.imdbId,
      mediaType: meta.mediaType,
      rating: meta.rating,
      ratingRaw: meta.ratingRaw,
      source: 'cinemeta',
    };
  }
}

/** @deprecated Use ImdbProviderAdapter */
export const ImdbRatingsAdapter = ImdbProviderAdapter;

/** @deprecated Use ImdbProviderAdapter */
export const ImdbRatingsStubAdapter = ImdbProviderAdapter;

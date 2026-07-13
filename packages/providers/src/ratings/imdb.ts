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

export interface ImdbRating {
  imdbId: string;
  mediaType: ImdbMediaType;
  /** Numeric rating when parseable (e.g. 8.8). */
  rating?: number;
  /** Raw provider string (e.g. "8.8"). */
  ratingRaw?: string;
  source: 'cinemeta';
}

export interface ImdbRatingsAdapterOptions {
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  cache?: ProviderCacheStore;
  cacheTtlMs?: number;
  health?: ProviderHealthTracker;
}

/**
 * IMDb rating adapter via Cinemeta public meta endpoint.
 * Independent MetaLayer implementation (no credential required).
 */
export class ImdbRatingsAdapter implements ProviderAdapter {
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

  constructor(options: ImdbRatingsAdapterOptions = {}) {
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
    await this.getRating(ctx, 'tt0137523', 'movie');
    return this.getHealth();
  }

  async getRating(
    ctx: ProviderContext,
    imdbId: string,
    mediaType: ImdbMediaType = 'movie',
  ): Promise<ImdbRating> {
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
      operation: 'rating',
      identity: `${mediaType}:${normalized}`,
    });

    if (this.cache) {
      const existing = await this.cache.get<ImdbRating>(key);
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
        const body = (await response.json()) as {
          meta?: { imdbRating?: string | number };
        };
        const ratingRaw =
          body.meta?.imdbRating !== undefined && body.meta?.imdbRating !== null
            ? String(body.meta.imdbRating)
            : undefined;
        const rating =
          ratingRaw !== undefined && ratingRaw !== '' && !Number.isNaN(Number(ratingRaw))
            ? Number(ratingRaw)
            : undefined;

        return {
          imdbId: normalized,
          mediaType,
          rating,
          ratingRaw,
          source: 'cinemeta' as const,
        };
      },
    });

    await this.cache?.set(key, value, {
      ttlMs: this.cacheTtlMs,
      source: this.id,
      degraded: value.rating === undefined,
      staleEligible: value.rating !== undefined,
    });
    this.lastCacheStatus = this.cache ? 'miss' : 'bypass';
    return value;
  }
}

/** @deprecated Use ImdbRatingsAdapter */
export const ImdbRatingsStubAdapter = ImdbRatingsAdapter;

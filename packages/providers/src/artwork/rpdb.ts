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
import { unsupportedLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';
import type { ArtworkAsset, ArtworkBundle, ArtworkKind, ProviderFetch } from './types.js';

export interface RpdbAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

export type RpdbMediaType = 'movie' | 'series';

/**
 * RatingPosterDB artwork adapter.
 * Poster URLs are deterministic; ping validates the key with a HEAD/GET probe.
 */
export class RpdbArtworkAdapter implements ProviderAdapter {
  readonly id = 'rpdb';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly defaultApiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: RpdbAdapterOptions = {}) {
    const definition = getProvider('rpdb');
    if (!definition) {
      throw new Error('RPDB is missing from PROVIDER_REGISTRY');
    }
    this.definition = definition;
    this.baseUrl = (options.baseUrl ?? 'https://api.ratingposterdb.com').replace(
      /\/$/,
      '',
    );
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  buildPosterUrl(options: {
    apiKey: string;
    mediaType: RpdbMediaType;
    tmdbId: number | string;
    kind?: ArtworkKind;
    language?: string;
  }): string {
    const kind = options.kind ?? 'poster';
    const mediaPath = `${options.mediaType}-${options.tmdbId}`;
    const url = new URL(
      `${this.baseUrl}/${options.apiKey}/tmdb/${kind}-default/${mediaPath}.png`,
    );
    url.searchParams.set('fallback', 'true');
    if (options.language && !isEnglish(options.language)) {
      url.searchParams.set('lang', toRpdbLang(options.language));
    }
    return url.toString();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    const apiKey = this.resolveApiKey(ctx);
    const probeUrl = this.buildPosterUrl({
      apiKey,
      mediaType: 'movie',
      tmdbId: 550,
      kind: 'poster',
    });

    await withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(probeUrl, {
          method: 'GET',
          signal,
          headers: {
            'X-Correlation-Id': ctx.correlationId,
          },
        });
        // 200 image or 404 empty art still proves the key path is reachable.
        if (response.status === 401 || response.status === 403) {
          throw classifyHttpStatus(response.status, this.id);
        }
        if (!response.ok && response.status !== 404) {
          throw classifyHttpStatus(response.status, this.id);
        }
        return true;
      },
    });

    return this.getHealth();
  }

  getMovieArtwork(
    ctx: ProviderContext,
    tmdbId: number,
    kinds: ArtworkKind[] = ['poster'],
  ): ArtworkBundle {
    const apiKey = this.resolveApiKey(ctx);
    const assets: ArtworkAsset[] = kinds.map((kind) => ({
      kind,
      url: this.buildPosterUrl({
        apiKey,
        mediaType: 'movie',
        tmdbId,
        kind,
        language: ctx.locale,
      }),
      provider: 'rpdb',
    }));

    return {
      providerId: this.id,
      identity: `tmdb:movie:${tmdbId}`,
      assets,
    };
  }

  private resolveApiKey(ctx: ProviderContext): string {
    const apiKey = ctx.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'RPDB API key is missing',
        retryable: false,
      });
    }
    return apiKey;
  }
}

function isEnglish(locale: string): boolean {
  const normalized = locale.toLowerCase();
  return normalized === 'en' || normalized.startsWith('en-');
}

function toRpdbLang(locale: string): string {
  const full = [
    'pt-PT',
    'pt-BR',
    'es-ES',
    'es-MX',
    'zh-CN',
    'zh-HK',
    'zh-SG',
    'zh-TW',
  ];
  if (full.includes(locale)) return locale;
  return locale.split('-')[0] || locale;
}

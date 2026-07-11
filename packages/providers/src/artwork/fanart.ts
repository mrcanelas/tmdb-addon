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
import { languageOnlyLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';
import type { ArtworkAsset, ArtworkBundle, ProviderFetch } from './types.js';

export interface FanartAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
}

type FanartImage = {
  url?: string;
  lang?: string;
  likes?: string | number;
};

/**
 * Fanart.tv artwork adapter — independent MetaLayer implementation.
 * Uses the public webservice movie/tv endpoints with injectable fetch for tests.
 */
export class FanartArtworkAdapter implements ProviderAdapter {
  readonly id = 'fanart';
  readonly locale: ProviderLocaleAdapter = languageOnlyLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly defaultApiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: FanartAdapterOptions = {}) {
    const definition = getProvider('fanart');
    if (!definition) {
      throw new Error('Fanart is missing from PROVIDER_REGISTRY');
    }
    this.definition = definition;
    this.baseUrl = (options.baseUrl ?? 'https://webservice.fanart.tv/v3').replace(
      /\/$/,
      '',
    );
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    // Fight Club is a stable public movie id used only as a connectivity probe.
    await this.requestJson(ctx, '/movies/550');
    return this.getHealth();
  }

  async getMovieArtwork(
    ctx: ProviderContext,
    tmdbId: number,
  ): Promise<ArtworkBundle> {
    const raw = await this.requestJson(ctx, `/movies/${tmdbId}`);
    const preferred = this.locale.toProviderLocale({
      locale: ctx.locale ?? 'en-US',
      region: ctx.region,
    }).language;

    const assets: ArtworkAsset[] = [
      ...mapImages(raw.movieposter, 'poster', preferred),
      ...mapImages(raw.moviebackground, 'background', preferred),
      ...mapImages(raw.hdmovielogo ?? raw.movielogo, 'logo', preferred),
    ];

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
        message: 'Fanart.tv API key is missing',
        retryable: false,
      });
    }
    return apiKey;
  }

  private async requestJson(
    ctx: ProviderContext,
    path: string,
  ): Promise<Record<string, FanartImage[] | undefined>> {
    const apiKey = this.resolveApiKey(ctx);
    const url = `${this.baseUrl}${path}?api_key=${encodeURIComponent(apiKey)}`;

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
        return (await response.json()) as Record<string, FanartImage[] | undefined>;
      },
    });
  }
}

function mapImages(
  images: FanartImage[] | undefined,
  kind: ArtworkAsset['kind'],
  preferredLanguage?: string,
): ArtworkAsset[] {
  if (!images?.length) return [];
  const preferred = preferredLanguage?.toLowerCase();
  const sorted = [...images].sort((a, b) => {
    const aLang = (a.lang ?? '').toLowerCase();
    const bLang = (b.lang ?? '').toLowerCase();
    const aScore = preferred && aLang === preferred ? 1 : 0;
    const bScore = preferred && bLang === preferred ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return Number(b.likes ?? 0) - Number(a.likes ?? 0);
  });

  return sorted
    .filter((image) => typeof image.url === 'string' && image.url.length > 0)
    .map((image) => ({
      kind,
      url: image.url as string,
      language: image.lang,
      likes: Number(image.likes ?? 0) || undefined,
      provider: 'fanart',
    }));
}

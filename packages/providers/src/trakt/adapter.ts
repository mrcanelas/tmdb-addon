import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
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

export interface TraktWatchStateFixture {
  imdb?: string;
  tmdb?: number;
  mediaType: 'movie' | 'series' | 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  progress?: number;
}

export interface TraktAdapterOptions {
  accessToken?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  /** Injectable fixture for CI — live Trakt OAuth is Phase I+. */
  fixtures?: TraktWatchStateFixture[];
}

/**
 * Trakt tracking adapter (independent MetaLayer implementation).
 * Phase I ships fixture/lookup mode + ping; full OAuth browser flow follows.
 */
export class TraktTrackingAdapter implements ProviderAdapter {
  readonly id = 'trakt';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly accessToken?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: TraktWatchStateFixture[];

  constructor(options: TraktAdapterOptions = {}) {
    const definition = getProvider('trakt');
    if (!definition) throw new Error('Trakt is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    if (!this.accessToken && this.fixtures.length === 0) {
      // Connectivity without token still probes the public API root.
      const response = await this.fetchImpl('https://api.trakt.tv/', {
        method: 'GET',
        signal: ctx.signal,
        headers: {
          'trakt-api-version': '2',
          'X-Correlation-Id': ctx.correlationId,
        },
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(`Trakt ping failed (${response.status})`);
      }
    }
    return this.getHealth();
  }

  async getWatchStates(): Promise<
    Array<{
      provider: 'trakt';
      mediaType: 'movie' | 'series' | 'anime';
      status: TraktWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }>
  > {
    return this.fixtures.map((item) => ({
      provider: 'trakt' as const,
      mediaType: item.mediaType,
      status: item.status,
      progress: item.progress,
      externalIds: {
        ...(item.imdb ? { imdb: item.imdb } : {}),
        ...(item.tmdb !== undefined ? { tmdb: item.tmdb } : {}),
      },
    }));
  }
}

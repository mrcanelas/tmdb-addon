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

export interface SimklWatchStateFixture {
  imdb?: string;
  tmdb?: number;
  mediaType: 'movie' | 'series' | 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
}

export interface SimklAdapterOptions {
  accessToken?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  fixtures?: SimklWatchStateFixture[];
}

/** SIMKL tracking adapter stub — fixture-backed for Phase I. */
export class SimklTrackingAdapter implements ProviderAdapter {
  readonly id = 'simkl';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: SimklWatchStateFixture[];

  constructor(options: SimklAdapterOptions = {}) {
    const definition = getProvider('simkl');
    if (!definition) throw new Error('SIMKL is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    void this.fetchImpl;
    void ctx;
    return this.getHealth();
  }

  async getWatchStates() {
    return this.fixtures.map((item) => ({
      provider: 'simkl' as const,
      mediaType: item.mediaType,
      status: item.status,
      externalIds: {
        ...(item.imdb ? { imdb: item.imdb } : {}),
        ...(item.tmdb !== undefined ? { tmdb: item.tmdb } : {}),
      },
    }));
  }
}

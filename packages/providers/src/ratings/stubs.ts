import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  type ProviderAdapter,
  type ProviderContext,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from '../core/runtime.js';
import { ProviderError } from '../core/errors.js';
import { unsupportedLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';

/**
 * Placeholder ratings adapter until IMDb/MDBList rating fetchers are wired.
 * Keeps core rating resolution provider-neutral.
 */
export class ImdbRatingsStubAdapter implements ProviderAdapter {
  readonly id = 'imdb';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  private readonly health: ProviderHealthTracker;

  constructor(policy?: Partial<ProviderHttpPolicy>) {
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...policy };
    this.health = new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(_ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    throw new ProviderError({
      code: 'unsupported',
      providerId: this.id,
      message: 'IMDb ratings adapter is not implemented yet',
      retryable: false,
    });
  }
}

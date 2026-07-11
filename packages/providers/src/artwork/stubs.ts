import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  type ProviderAdapter,
  type ProviderContext,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from '../core/runtime.js';
import { ProviderError } from '../core/errors.js';
import {
  languageOnlyLocaleAdapter,
  unsupportedLocaleAdapter,
} from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';

/**
 * Artwork adapters land fully when image resolution pipelines exist.
 * These stubs declare the ProviderAdapter contract and locale limitations.
 */
abstract class ArtworkStubAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly locale: ProviderLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;
  protected readonly health: ProviderHealthTracker;

  constructor(providerId: string, policy?: Partial<ProviderHttpPolicy>) {
    const definition = getProvider(providerId);
    if (!definition) {
      throw new Error(`Provider ${providerId} is missing from PROVIDER_REGISTRY`);
    }
    this.definition = definition;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...policy };
    this.health = new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    if (!ctx.apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: `${this.definition.name} API key is missing`,
        retryable: false,
      });
    }
    this.health.recordSuccess(0);
    return this.getHealth();
  }
}

export class FanartArtworkAdapter extends ArtworkStubAdapter {
  readonly id = 'fanart';
  readonly locale = languageOnlyLocaleAdapter;

  constructor(policy?: Partial<ProviderHttpPolicy>) {
    super('fanart', policy);
  }
}

export class RpdbArtworkAdapter extends ArtworkStubAdapter {
  readonly id = 'rpdb';
  readonly locale = unsupportedLocaleAdapter;

  constructor(policy?: Partial<ProviderHttpPolicy>) {
    super('rpdb', policy);
  }
}

import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from './health.js';

/**
 * Process-scoped health trackers so circuit breakers accumulate across requests.
 */
export class ProviderHealthRegistry {
  private readonly trackers = new Map<string, ProviderHealthTracker>();
  private readonly policy: ProviderHttpPolicy;

  constructor(policy: Partial<ProviderHttpPolicy> = {}) {
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...policy };
  }

  /** Default HTTP / circuit policy applied to new trackers (and app adapters). */
  getDefaultPolicy(): ProviderHttpPolicy {
    return { ...this.policy };
  }

  getOrCreate(
    providerId: string,
    policy?: Partial<ProviderHttpPolicy>,
  ): ProviderHealthTracker {
    const existing = this.trackers.get(providerId);
    if (existing) return existing;

    const tracker = new ProviderHealthTracker({
      ...this.policy,
      ...policy,
    });
    this.trackers.set(providerId, tracker);
    return tracker;
  }

  get(providerId: string): ProviderHealthTracker | undefined {
    return this.trackers.get(providerId);
  }

  snapshot(providerId: string): ProviderHealthSnapshot | undefined {
    return this.trackers.get(providerId)?.snapshot();
  }

  snapshotAll(): Record<string, ProviderHealthSnapshot> {
    const out: Record<string, ProviderHealthSnapshot> = {};
    for (const [providerId, tracker] of this.trackers) {
      out[providerId] = tracker.snapshot();
    }
    return out;
  }

  reset(providerId?: string): void {
    if (providerId) {
      this.trackers.delete(providerId);
      return;
    }
    this.trackers.clear();
  }
}

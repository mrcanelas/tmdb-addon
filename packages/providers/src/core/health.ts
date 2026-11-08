import { ProviderError } from './errors.js';

export type HealthState = 'healthy' | 'degraded' | 'open';

export interface ProviderHealthSnapshot {
  state: HealthState;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorCode?: string;
  latencyMs?: number;
}

export interface ProviderHttpPolicy {
  timeoutMs: number;
  maxRetries: number;
  backoffMs: number;
  circuitFailureThreshold: number;
  circuitOpenMs: number;
}

export const DEFAULT_PROVIDER_HTTP_POLICY: ProviderHttpPolicy = {
  timeoutMs: 8_000,
  maxRetries: 2,
  backoffMs: 200,
  circuitFailureThreshold: 5,
  circuitOpenMs: 30_000,
};

export class ProviderHealthTracker {
  private consecutiveFailures = 0;
  private lastSuccessAt?: string;
  private lastFailureAt?: string;
  private lastErrorCode?: string;
  private latencyMs?: number;
  private openedAt?: number;

  constructor(private readonly policy: ProviderHttpPolicy) {}

  snapshot(): ProviderHealthSnapshot {
    return {
      state: this.currentState(),
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastErrorCode: this.lastErrorCode,
      latencyMs: this.latencyMs,
    };
  }

  currentState(): HealthState {
    if (this.openedAt !== undefined) {
      if (Date.now() - this.openedAt < this.policy.circuitOpenMs) {
        return 'open';
      }
      return 'degraded';
    }
    if (this.consecutiveFailures > 0) return 'degraded';
    return 'healthy';
  }

  assertClosed(providerId: string): void {
    if (this.currentState() === 'open') {
      throw new ProviderError({
        code: 'circuit_open',
        providerId,
        message: `Provider ${providerId} circuit is open`,
        retryable: true,
      });
    }
  }

  recordSuccess(latencyMs: number): void {
    this.consecutiveFailures = 0;
    this.openedAt = undefined;
    this.lastSuccessAt = new Date().toISOString();
    this.latencyMs = latencyMs;
    this.lastErrorCode = undefined;
  }

  recordFailure(errorCode: string): void {
    this.consecutiveFailures += 1;
    this.lastFailureAt = new Date().toISOString();
    this.lastErrorCode = errorCode;
    if (this.consecutiveFailures >= this.policy.circuitFailureThreshold) {
      this.openedAt = Date.now();
    }
  }
}

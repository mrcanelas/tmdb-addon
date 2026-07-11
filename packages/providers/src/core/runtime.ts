import { ProviderError } from './errors.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from './health.js';

export type { ProviderHttpPolicy, ProviderHealthSnapshot };
export { DEFAULT_PROVIDER_HTTP_POLICY, ProviderHealthTracker };

export interface ProviderContext {
  correlationId: string;
  locale?: string;
  region?: string;
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Shared runtime contract for every MetaLayer provider adapter.
 * Core packages call this surface; provider-specific code stays in adapters.
 */
export interface ProviderAdapter {
  readonly id: string;
  readonly policy: ProviderHttpPolicy;
  getHealth(): ProviderHealthSnapshot;
  /** Lightweight connectivity check used by Sources diagnostics. */
  ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot>;
}

export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      );
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parent?.aborted) {
    controller.abort();
  } else {
    parent?.addEventListener('abort', onParentAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw Object.assign(new Error('Provider request timed out'), {
        name: 'AbortError',
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onParentAbort);
  }
}

export async function withRetry<T>(options: {
  providerId: string;
  policy: ProviderHttpPolicy;
  health: ProviderHealthTracker;
  signal?: AbortSignal;
  execute: (signal: AbortSignal) => Promise<T>;
}): Promise<T> {
  options.health.assertClosed(options.providerId);

  let attempt = 0;

  while (true) {
    const started = Date.now();
    try {
      const result = await withTimeout(
        (signal) => options.execute(signal),
        options.policy.timeoutMs,
        options.signal,
      );
      options.health.recordSuccess(Date.now() - started);
      return result;
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code:
                error instanceof Error && error.name === 'AbortError'
                  ? 'timeout'
                  : 'network',
              providerId: options.providerId,
              message:
                error instanceof Error ? error.message : 'Provider request failed',
              cause: error,
              retryable: true,
            });

      options.health.recordFailure(providerError.code);

      const canRetry =
        providerError.retryable && attempt < options.policy.maxRetries;
      if (!canRetry) throw providerError;

      const delay = options.policy.backoffMs * 2 ** attempt;
      attempt += 1;
      await sleep(delay, options.signal);
      options.health.assertClosed(options.providerId);
    }
  }
}

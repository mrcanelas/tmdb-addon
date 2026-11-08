import {
  buildProviderCacheKey,
  hashFallbackChain,
  type ProviderContext,
} from '@metalayer/providers';
import type { CacheStore, CacheStatus } from './types.js';

export interface CachedLoadResult<T> {
  value: T;
  cacheStatus: CacheStatus | 'bypass';
  key: string;
}

/**
 * Load-through helper that keeps locale/region in the key and skips caching
 * degraded responses unless explicitly allowed.
 */
export async function cachedLoad<T>(options: {
  cache?: CacheStore;
  providerId: string;
  operation: string;
  ctx: ProviderContext;
  identity?: string;
  fallbackChain?: string[];
  extra?: string;
  ttlMs?: number;
  load: () => Promise<T>;
  isDegraded?: (value: T) => boolean;
}): Promise<CachedLoadResult<T>> {
  const key = buildProviderCacheKey({
    providerId: options.providerId,
    operation: options.operation,
    identity: options.identity,
    locale: options.ctx.locale,
    region: options.ctx.region,
    fallbackChain: options.fallbackChain,
    extra: options.extra,
  });

  if (!options.cache) {
    return {
      value: await options.load(),
      cacheStatus: 'bypass',
      key,
    };
  }

  const existing = await options.cache.get<T>(key);
  if (existing) {
    return {
      value: existing.entry.value,
      cacheStatus: existing.status,
      key,
    };
  }

  const value = await options.load();
  const degraded = options.isDegraded?.(value) ?? false;
  await options.cache.set(key, value, {
    ttlMs: options.ttlMs ?? 15 * 60_000,
    source: options.providerId,
    degraded,
    staleEligible: !degraded,
  });

  return { value, cacheStatus: 'miss', key };
}

export { buildProviderCacheKey, hashFallbackChain };

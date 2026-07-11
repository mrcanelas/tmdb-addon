/**
 * Minimal cache port used by provider adapters.
 * Implemented by `@metalayer/cache` MemoryCache without a reverse dependency.
 */
export interface ProviderCacheGetResult<T> {
  status: 'hit' | 'miss' | 'stale';
  entry: { value: T };
}

export interface ProviderCacheStore {
  get<T>(key: string): ProviderCacheGetResult<T> | null;
  set<T>(
    key: string,
    value: T,
    options: {
      ttlMs: number;
      source?: string;
      degraded?: boolean;
      staleEligible?: boolean;
    },
  ): unknown;
}

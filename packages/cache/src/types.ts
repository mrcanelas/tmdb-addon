export type CacheStatus = 'hit' | 'miss' | 'stale';

/**
 * Cache entry metadata required by AGENTS.md §28.
 * Transient/degraded values must not poison long-lived caches.
 */
export interface CacheEntryMeta {
  createdAt: number;
  expiresAt: number;
  source: string;
  degraded: boolean;
  staleEligible: boolean;
}

export interface CacheEntry<T> extends CacheEntryMeta {
  value: T;
}

export interface CacheSetOptions {
  /** Time to live in milliseconds. */
  ttlMs: number;
  source?: string;
  degraded?: boolean;
  /** When true, expired entries may be returned as stale until refreshed. */
  staleEligible?: boolean;
}

export interface CacheGetResult<T> {
  status: CacheStatus;
  entry: CacheEntry<T>;
}

export interface CacheStore {
  get<T>(key: string): CacheGetResult<T> | null;
  set<T>(key: string, value: T, options: CacheSetOptions): CacheEntry<T>;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

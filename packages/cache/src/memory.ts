import type {
  CacheEntry,
  CacheGetResult,
  CacheSetOptions,
  CacheStore,
} from './types.js';

export interface MemoryCacheOptions {
  /** Soft cap on entries; oldest expired/created are evicted first. */
  maxEntries?: number;
  now?: () => number;
}

/**
 * In-process memory cache for MetaLayer Lite and request-scoped reuse.
 * Keys must be built with locale/region fragments and must never include secrets.
 */
export class MemoryCache implements CacheStore {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;
  private readonly now: () => number;
  hits = 0;
  misses = 0;
  stales = 0;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 2_000;
    this.now = options.now ?? (() => Date.now());
  }

  get<T>(key: string): CacheGetResult<T> | null {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.misses += 1;
      return null;
    }

    const current = this.now();
    if (current <= entry.expiresAt) {
      this.hits += 1;
      return { status: 'hit', entry };
    }

    if (entry.staleEligible) {
      this.stales += 1;
      return { status: 'stale', entry };
    }

    this.entries.delete(key);
    this.misses += 1;
    return null;
  }

  set<T>(key: string, value: T, options: CacheSetOptions): CacheEntry<T> {
    // Do not store degraded payloads in long-lived slots.
    const ttlMs =
      options.degraded && !options.staleEligible
        ? Math.min(options.ttlMs, 30_000)
        : options.ttlMs;

    const createdAt = this.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt,
      expiresAt: createdAt + Math.max(0, ttlMs),
      source: options.source ?? 'unknown',
      degraded: options.degraded ?? false,
      staleEligible: options.staleEligible ?? false,
    };

    this.entries.set(key, entry as CacheEntry<unknown>);
    this.evictIfNeeded();
    return entry;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  stats() {
    return {
      size: this.size(),
      hits: this.hits,
      misses: this.misses,
      stales: this.stales,
    };
  }

  private evictIfNeeded(): void {
    if (this.entries.size <= this.maxEntries) return;

    const current = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt < current && !entry.staleEligible) {
        this.entries.delete(key);
      }
      if (this.entries.size <= this.maxEntries) return;
    }

    const oldestKey = this.entries.keys().next().value;
    if (oldestKey !== undefined) this.entries.delete(oldestKey);
  }
}

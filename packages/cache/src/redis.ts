import { Redis } from 'ioredis';
import type {
  CacheEntry,
  CacheGetResult,
  CacheSetOptions,
  CacheStore,
} from './types.js';

export interface RedisCacheOptions {
  /** Redis connection URL, e.g. redis://localhost:6379 */
  url: string;
  /** Key namespace prefix. */
  keyPrefix?: string;
  now?: () => number;
  /** Optional injectable Redis client (tests). */
  client?: Redis;
}

type StoredEntry = CacheEntry<unknown>;

/**
 * Shared Redis cache for MetaLayer Server.
 * Entries are JSON-encoded CacheEntry payloads with TTL aligned to expiresAt.
 */
export class RedisCache implements CacheStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly now: () => number;
  private readonly ownsClient: boolean;
  hits = 0;
  misses = 0;
  stales = 0;

  constructor(options: RedisCacheOptions) {
    this.prefix = options.keyPrefix ?? 'metalayer:cache:v1:';
    this.now = options.now ?? (() => Date.now());
    this.ownsClient = !options.client;
    this.redis =
      options.client ??
      new Redis(options.url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: false,
      });
  }

  private namespaced(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<CacheGetResult<T> | null> {
    const raw = await this.redis.get(this.namespaced(key));
    if (!raw) {
      this.misses += 1;
      return null;
    }

    let entry: CacheEntry<T>;
    try {
      entry = JSON.parse(raw) as CacheEntry<T>;
    } catch {
      await this.redis.del(this.namespaced(key));
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

    await this.redis.del(this.namespaced(key));
    this.misses += 1;
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions,
  ): Promise<CacheEntry<T>> {
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

    const redisKey = this.namespaced(key);
    const payload = JSON.stringify(entry as StoredEntry);
    const ttlSeconds = Math.max(1, Math.ceil(Math.max(0, ttlMs) / 1000));

    // Keep stale-eligible entries past soft expiry so get() can serve stale.
    if (entry.staleEligible) {
      const staleTtlSeconds = Math.max(ttlSeconds * 2, ttlSeconds + 60);
      await this.redis.set(redisKey, payload, 'EX', staleTtlSeconds);
    } else {
      await this.redis.set(redisKey, payload, 'EX', ttlSeconds);
    }

    return entry;
  }

  async delete(key: string): Promise<boolean> {
    const removed = await this.redis.del(this.namespaced(key));
    return removed > 0;
  }

  async clear(): Promise<void> {
    const pattern = `${this.prefix}*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async size(): Promise<number> {
    const pattern = `${this.prefix}*`;
    let cursor = '0';
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      count += keys.length;
    } while (cursor !== '0');
    return count;
  }

  stats() {
    return {
      size: -1,
      hits: this.hits,
      misses: this.misses,
      stales: this.stales,
    };
  }

  async ping(): Promise<boolean> {
    const result = await this.redis.ping();
    return result === 'PONG';
  }

  async close(): Promise<void> {
    if (this.ownsClient) {
      await this.redis.quit();
    }
  }
}

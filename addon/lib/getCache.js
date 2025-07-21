const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NO_CACHE = process.env.NO_CACHE === 'true';

const META_TTL = 7 * 24 * 60 * 60;     // 7 days in seconds
const CATALOG_TTL = 1 * 24 * 60 * 60;  // 1 day in seconds
const TVDB_API_TTL = 12 * 60 * 60;   // 12 hours in seconds for API data

const redis = NO_CACHE ? null : new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

if (redis) {
  redis.on('error', err => console.error('Redis Client Error:', err));
  redis.on('connect', () => console.log('Redis client connected.'));
}

const inFlightRequests = new Map();

/**
 * A robust, production-grade cache wrapper.
 * - Fetches from Redis cache first.
 * - Prevents "cache stampede" by tracking in-flight requests.
 * @param {string} key The unique cache key.
 * @param {Function} method The async function to execute on a cache miss.
 * @param {number} ttl The Time To Live for the cache entry in seconds.
 * @returns The result of the method, from cache or a fresh call.
 */
async function cacheWrap(key, method, ttl) {
  if (NO_CACHE || !redis) return method();
  try {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.warn(`Failed to parse cached JSON for key ${key}:`, err);
      }
    }
  } catch (err) {
    console.warn(`Failed to read from Redis for key ${key}:`, err);
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = method();

  inFlightRequests.set(key, promise);

  try {
    const result = await promise;

    // Only cache valid results to allow for retries on temporary API failures
    if (result !== null && result !== undefined) {
      try {
        await redis.set(key, JSON.stringify(result), 'EX', ttl);
      } catch (err) {
        console.warn(`Failed to write to Redis for key ${key}:`, err);
      }
    }
    return result;
  } catch (error) {
    console.error(`Method failed for cache key ${key}:`, error);
    throw error;
  } finally {
    inFlightRequests.delete(key);
  }
}

function cacheWrapCatalog(id, method) {
  return cacheWrap(`catalog:${id}`, method, CATALOG_TTL);
}

function cacheWrapMeta(id, method) {
  return cacheWrap(`meta:${id}`, method, META_TTL);
}

function cacheWrapTvdbApi(key, method) {
  return cacheWrap(`tvdb-api:${key}`, method, TVDB_API_TTL);
}

module.exports = {
  cacheWrapCatalog,
  cacheWrapMeta,
  cacheWrapTvdbApi
};

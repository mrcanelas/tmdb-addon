const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NO_CACHE = process.env.NO_CACHE === 'true';
const META_TTL = 7 * 24 * 60 * 60;     // 7 days in seconds
const CATALOG_TTL = 1 * 24 * 60 * 60;  // 1 day in seconds

const redis = NO_CACHE ? null : new Redis(REDIS_URL);

async function cacheWrap(key, method, ttl) {
  if (NO_CACHE || !redis) return method();

  try {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.warn(`Failed to parse cached data for key ${key}:`, err);
      }
    }
  } catch (err) {
    console.warn(`Failed to read cache for key ${key}:`, err);
  }

  const result = await method();

  try {
    await redis.set(key, JSON.stringify(result), 'EX', ttl);
  } catch (err) {
    console.warn(`Failed to write cache for key ${key}:`, err);
  }

  return result;
}

function cacheWrapCatalog(id, method) {
  return cacheWrap(`catalog:${id}`, method, CATALOG_TTL);
}

function cacheWrapMeta(id, method) {
  return cacheWrap(`meta:${id}`, method, META_TTL);
}

module.exports = { cacheWrapCatalog, cacheWrapMeta };


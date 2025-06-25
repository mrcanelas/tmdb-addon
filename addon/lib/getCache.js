const Redis = require('ioredis');

const GLOBAL_KEY_PREFIX = 'tmdb-addon';
const META_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|meta`;
const CATALOG_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|catalog`;

const META_TTL = parseInt(process.env.META_TTL || `${7 * 24 * 60 * 60}`); // 7 days
const CATALOG_TTL = parseInt(process.env.CATALOG_TTL || `${1 * 24 * 60 * 60}`); // 1 day

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NO_CACHE = process.env.NO_CACHE === 'true';

const redis = NO_CACHE ? null : new Redis(REDIS_URL);

async function cacheWrap(key, method, options) {
  if (NO_CACHE || !redis) {
    return method();
  }

  const cached = await redis.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      console.error(`Error parsing cache key: ${key}`, err);
    }
  }

  const result = await method();
  await redis.set(key, JSON.stringify(result), 'EX', options.ttl);
  return result;
}

function cacheWrapCatalog(id, method) {
  return cacheWrap(`${CATALOG_KEY_PREFIX}:${id}`, method, { ttl: CATALOG_TTL });
}

function cacheWrapMeta(id, method) {
  return cacheWrap(`${META_KEY_PREFIX}:${id}`, method, { ttl: META_TTL });
}

module.exports = { cacheWrapCatalog, cacheWrapMeta };
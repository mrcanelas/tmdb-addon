const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-ioredis');
const Redis = require('ioredis');

const GLOBAL_KEY_PREFIX = 'tmdb-addon';
const META_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|meta`;
const CATALOG_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|catalog`;

const META_TTL = process.env.META_TTL || 7 * 24 * 60 * 60; // 7 day
const CATALOG_TTL = process.env.CATALOG_TTL || 1 * 24 * 60 * 60; // 1 day

const NO_CACHE = process.env.NO_CACHE || false;
const REDIS_URL = process.env.REDIS_URL;

// Redis instance global (se disponível)
let redisInstance = null;

// Cache principal (Redis ou memória) - usado para dados importantes
const cache = initiateCache();

// Cache em memória dedicado para catalog e meta - sempre em memória para economizar Redis
const memoryCache = initiateMemoryCache();

function initiateCache() {
  if (NO_CACHE) {
    return null;
  } else if (REDIS_URL) {
    redisInstance = new Redis(REDIS_URL);
    return cacheManager.caching({
      store: redisStore,
      redisInstance: redisInstance,
      ttl: META_TTL
    });
  } else {
    return cacheManager.caching({
      store: 'memory',
      ttl: META_TTL
    });
  }
}

function initiateMemoryCache() {
  if (NO_CACHE) {
    return null;
  }
  // Sempre usa cache em memória para catalog e meta, independente de Redis estar disponível
  return cacheManager.caching({
    store: 'memory',
    ttl: META_TTL
  });
}

function cacheWrap(key, method, options) {
  if (NO_CACHE || !cache) {
    return method();
  }
  return cache.wrap(key, method, options);
}

function cacheWrapMemory(key, method, options) {
  if (NO_CACHE || !memoryCache) {
    return method();
  }
  return memoryCache.wrap(key, method, options);
}

function cacheWrapCatalog(id, method) {
  // Usa cache em memória para economizar Redis
  return cacheWrapMemory(`${CATALOG_KEY_PREFIX}:${id}`, method, { ttl: CATALOG_TTL });
}

function cacheWrapMeta(id, method) {
  // Usa cache em memória para economizar Redis
  return cacheWrapMemory(`${META_KEY_PREFIX}:${id}`, method, { ttl: META_TTL });
}

module.exports = { cacheWrapCatalog, cacheWrapMeta, cacheWrap, cache, redisInstance };
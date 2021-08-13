const cacheManager = require('cache-manager');
const mangodbStore = require('cache-manager-mongodb');

const GLOBAL_KEY_PREFIX = 'tmdb-addon';
const META_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|meta`;
const CATALOG_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|catalog`;

const META_TTL = process.env.META_TTL || 24 * 60 * 60; // 1 day
const CATALOG_TTL = process.env.CATALOG_TTL || 3 * 24 * 60 * 60; // 3 day

const NO_CACHE = process.env.NO_CACHE || false;

const cache = initiateCache();

function initiateCache() {
  return cacheManager.caching({
    store: 'memory',
    ttl: META_TTL
  })
}

function cacheWrap(key, method, options) {
  if (NO_CACHE || !cache) {
    return method();
  }
  return cache.wrap(key, method, options);
}

function cacheWrapCatalog(id, method) {
  return cacheWrap(`${CATALOG_KEY_PREFIX}:${id}`, method, { ttl: CATALOG_TTL });
}

function cacheWrapMeta(id, method) {
  return cacheWrap(`${META_KEY_PREFIX}:${id}`, method, { ttl: META_TTL });
}

module.exports = { cacheWrapCatalog, cacheWrapMeta };
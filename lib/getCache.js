import cacheManager from 'cache-manager';
import mangodbStore from 'cache-manager-mongodb';

const GLOBAL_KEY_PREFIX = 'tmdb-addon';
const META_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|meta`;

const META_TTL = process.env.META_TTL || 7 * 24 * 60 * 60; // 7 day

const MONGO_URI = process.env.MONGODB_URI;
const NO_CACHE = process.env.NO_CACHE || true;

const cache = initiateCache();

function initiateCache() {
  if (NO_CACHE) {
    return null;
  } else if (!NO_CACHE && MONGO_URI) {
    return cacheManager.caching({
      store: mangodbStore,
      uri: MONGO_URI,
      options: {
        collection: 'tmdb_collection',
        ttl: META_TTL
      },
      ttl: META_TTL,
      ignoreCacheErrors: true
    });
  } else {
    return cacheManager.caching({
      store: 'memory',
      ttl: META_TTL
    });
  }
}

function cacheWrap(key, method, options) {
  if (NO_CACHE || !cache) {
    return method();
  }
  return cache.set(key, method, options);
}

function cacheWrapMeta(id, method) {
  return cacheWrap(`${META_KEY_PREFIX}:${id}`, method, { ttl: META_TTL });
}

export default cacheWrapMeta;
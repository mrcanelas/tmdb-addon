const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-ioredis');
const Redis = require('ioredis');
const { mongoDbStore } = require('@tirke/node-cache-manager-mongodb');

const GLOBAL_KEY_PREFIX = 'tmdb-addon';
const META_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|meta`;
const CATALOG_KEY_PREFIX = `${GLOBAL_KEY_PREFIX}|catalog`;

const META_TTL = process.env.META_TTL || 7 * 24 * 60 * 60; // 7 day
const CATALOG_TTL = process.env.CATALOG_TTL || 1 * 24 * 60 * 60; // 1 day

const NO_CACHE = process.env.NO_CACHE || false;
const REDIS_URL = process.env.REDIS_URL;
const MONGODB_URI = process.env.MONGODB_URI;

// Redis instance global (se disponível)
let redisInstance = null;

// Cache principal (Redis ou memória) - usado para dados importantes
const cache = initiateCache();

// Cache MongoDB para catalog e meta
let mongoCache = null;

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

async function initiateMongoCache() {
  if (NO_CACHE || !MONGODB_URI) {
    return null;
  }

  try {
    mongoCache = await cacheManager.caching(mongoDbStore, {
      url: MONGODB_URI,
      ttl: META_TTL
    });
    console.log('MongoDB cache conectado com sucesso');
    return mongoCache;
  } catch (error) {
    console.error('Erro ao conectar MongoDB cache:', error);
    return null;
  }
}

// Inicializa MongoDB cache (lazy initialization)
let mongoInitPromise = null;
async function ensureMongoCache() {
  if (mongoCache) {
    return mongoCache;
  }
  
  if (!mongoInitPromise) {
    mongoInitPromise = initiateMongoCache();
  }
  
  return mongoInitPromise;
}

function cacheWrap(key, method, options) {
  if (NO_CACHE || !cache) {
    return method();
  }
  return cache.wrap(key, method, options);
}

async function cacheWrapMongo(key, method, ttl) {
  if (NO_CACHE || !MONGODB_URI) {
    return method();
  }

  // Garante que MongoDB cache está inicializado
  const mongo = await ensureMongoCache();
  
  if (!mongo) {
    return method();
  }

  try {
    return await mongo.wrap(key, method, { ttl });
  } catch (error) {
    console.error(`Erro no cache MongoDB para chave ${key}:`, error);
    // Em caso de erro, executa o método sem cache
    return method();
  }
}

function cacheWrapCatalog(id, method) {
  // Usa MongoDB para catalog
  return cacheWrapMongo(`${CATALOG_KEY_PREFIX}:${id}`, method, CATALOG_TTL);
}

function cacheWrapMeta(id, method) {
  // Usa MongoDB para meta
  return cacheWrapMongo(`${META_KEY_PREFIX}:${id}`, method, META_TTL);
}

// Função para fechar conexões ao encerrar
async function closeConnections() {
  if (redisInstance) {
    await redisInstance.quit();
  }
  // O mongoCache gerencia suas próprias conexões através do store
}

// Fecha conexões ao encerrar o processo
process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);

module.exports = { cacheWrapCatalog, cacheWrapMeta, cacheWrap, cache, redisInstance, mongoCache };
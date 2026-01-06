const { cache, redisInstance } = require('../lib/getCache');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Cache em memória como fallback se Redis não estiver disponível
const memoryCache = new Map();
const MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

// Chave base para armazenamento
const USER_COUNT_KEY = 'tmdb-addon:unique-users';
const USER_IPS_KEY = 'tmdb-addon:user-ips';

// URL da instância oficial (pode ser sobrescrita por variável de ambiente)
const OFFICIAL_INSTANCE_URL = process.env.OFFICIAL_INSTANCE_URL || 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club';

// ID único da instância atual (baseado no HOST_NAME ou gerado)
function getInstanceId() {
  const hostName = process.env.HOST_NAME || '';
  if (hostName) {
    try {
      const url = new URL(hostName);
      return url.hostname.replace(/\./g, '-');
    } catch (e) {
      return hostName.replace(/[^a-zA-Z0-9]/g, '-');
    }
  }
  // Gera um ID único baseado no hostname do sistema
  return require('os').hostname().replace(/\./g, '-');
}

const INSTANCE_ID = getInstanceId();

// Verifica se esta é a instância oficial
function isOfficialInstance() {
  const hostName = process.env.HOST_NAME || '';
  if (!hostName) return false;
  
  try {
    const currentUrl = new URL(hostName);
    const officialUrl = new URL(OFFICIAL_INSTANCE_URL);
    return currentUrl.hostname === officialUrl.hostname;
  } catch (e) {
    return hostName.includes('94c8cb9f702d-tmdb-addon.baby-beamup.club');
  }
}

/**
 * Gera um hash do IP para privacidade
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Obtém o IP real do cliente (considerando proxies)
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Registra um usuário único baseado no IP
 */
async function trackUser(req) {
  const ip = getClientIP(req);
  if (ip === 'unknown') return false;
  
  const ipHash = hashIP(ip);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `${USER_IPS_KEY}:${today}:${ipHash}`;
  
  try {
    if (cache) {
      // Usa cache (Redis ou memory)
      const exists = await cache.get(key);
      if (!exists) {
        await cache.set(key, '1', { ttl: 24 * 60 * 60 }); // 24 horas
        await incrementUserCount();
        return true;
      }
    } else {
      // Fallback para cache em memória local
      const existing = memoryCache.get(key);
      
      if (!existing) {
        memoryCache.set(key, Date.now());
        // Limpa entradas antigas periodicamente
        setTimeout(() => memoryCache.delete(key), MEMORY_TTL);
        await incrementUserCount();
        return true;
      }
    }
  } catch (error) {
    console.error('Error tracking user:', error);
  }
  
  return false;
}

/**
 * Incrementa o contador total de usuários únicos
 */
async function incrementUserCount() {
  try {
    if (cache) {
      const current = await cache.get(USER_COUNT_KEY) || '0';
      const newCount = parseInt(current) + 1;
      await cache.set(USER_COUNT_KEY, String(newCount), { ttl: 365 * 24 * 60 * 60 }); // 1 ano
    } else {
      const current = memoryCache.get(USER_COUNT_KEY) || 0;
      memoryCache.set(USER_COUNT_KEY, current + 1);
    }
  } catch (error) {
    console.error('Error incrementing user count:', error);
  }
}

/**
 * Obtém o total de usuários únicos
 */
async function getUserCount() {
  try {
    if (cache) {
      const count = await cache.get(USER_COUNT_KEY);
      return parseInt(count || '0');
    } else {
      return memoryCache.get(USER_COUNT_KEY) || 0;
    }
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

/**
 * Registra usuários de outras instâncias (para agregação)
 */
async function trackExternalUsers(count, instanceId) {
  if (!count || count <= 0) return;
  
  try {
    const key = `${USER_COUNT_KEY}:external:${instanceId}`;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${key}:${today}`;
    const instanceCountKey = `${USER_COUNT_KEY}:external-count:${instanceId}`;
    const activeInstancesKey = `${USER_COUNT_KEY}:active-instances`;
    
    if (cache) {
      // Armazena o count diário por instância
      await cache.set(dailyKey, String(count), { ttl: 7 * 24 * 60 * 60 }); // 7 dias
      
      // Armazena o count mais recente da instância (para agregação rápida)
      await cache.set(instanceCountKey, String(count), { ttl: 2 * 24 * 60 * 60 }); // 2 dias
      
      // Adiciona a instância à lista de instâncias ativas
      // Usa um SET do Redis se disponível, senão usa uma lista simples
      try {
        if (redisInstance && typeof redisInstance.sadd === 'function') {
          // Se temos acesso direto ao Redis, usa SET
          await redisInstance.sadd(activeInstancesKey, instanceId);
          await redisInstance.expire(activeInstancesKey, 2 * 24 * 60 * 60); // 2 dias
        }
      } catch (e) {
        // Se não conseguir usar SET, continua sem erro
      }
    } else {
      memoryCache.set(dailyKey, count);
      memoryCache.set(instanceCountKey, count);
      
      // Para cache em memória, mantém uma lista simples
      if (!memoryCache.has(activeInstancesKey)) {
        memoryCache.set(activeInstancesKey, new Set());
      }
      memoryCache.get(activeInstancesKey).add(instanceId);
    }
  } catch (error) {
    console.error('Error tracking external users:', error);
  }
}

/**
 * Obtém o total agregado de todas as instâncias
 */
async function getAggregatedUserCount() {
  try {
    const baseCount = await getUserCount();
    
    // Se é a instância oficial, agrega os counts de outras instâncias
    if (isOfficialInstance()) {
      let aggregatedCount = baseCount;
      
      try {
        if (redisInstance && typeof redisInstance.smembers === 'function') {
          // Usa Redis SET para buscar todas as instâncias ativas
          const activeInstancesKey = `${USER_COUNT_KEY}:active-instances`;
          const instanceIds = await redisInstance.smembers(activeInstancesKey);
          
          // Busca o count de cada instância ativa
          for (const instanceId of instanceIds) {
            try {
              const instanceCountKey = `${USER_COUNT_KEY}:external-count:${instanceId}`;
              const count = await cache.get(instanceCountKey);
              if (count) {
                aggregatedCount += parseInt(count || '0');
              }
            } catch (e) {
              // Ignora erros individuais e continua
            }
          }
        } else if (cache) {
          // Para cache em memória ou cache-manager sem acesso direto ao Redis
          // Tenta buscar instâncias conhecidas (limitado, mas funciona)
          // Nota: sem acesso direto ao Redis, não podemos listar todas as chaves
          // Então retornamos apenas o count local
        } else {
          // Cache em memória local
          const activeInstancesKey = `${USER_COUNT_KEY}:active-instances`;
          const instanceSet = memoryCache.get(activeInstancesKey);
          
          if (instanceSet && instanceSet instanceof Set) {
            for (const instanceId of instanceSet) {
              try {
                const instanceCountKey = `${USER_COUNT_KEY}:external-count:${instanceId}`;
                const count = memoryCache.get(instanceCountKey);
                if (count) {
                  aggregatedCount += parseInt(count || '0');
                }
              } catch (e) {
                // Ignora erros individuais
              }
            }
          }
        }
      } catch (error) {
        // Se falhar, retorna apenas o count local
        console.error('Error aggregating external counts:', error);
      }
      
      return aggregatedCount;
    }
    
    // Para instâncias não oficiais, retorna apenas o count local
    return baseCount;
  } catch (error) {
    console.error('Error getting aggregated user count:', error);
    return 0;
  }
}

/**
 * Reseta o contador (útil para testes ou reset diário)
 */
async function resetUserCount() {
  try {
    if (cache) {
      await cache.del(USER_COUNT_KEY);
    } else {
      memoryCache.delete(USER_COUNT_KEY);
    }
  } catch (error) {
    console.error('Error resetting user count:', error);
  }
}

/**
 * Reporta automaticamente os usuários para a instância oficial
 */
async function reportToOfficialInstance() {
  // Se esta é a instância oficial, não precisa reportar para si mesma
  if (isOfficialInstance()) {
    return;
  }

  try {
    const count = await getUserCount();
    if (count === 0) {
      return; // Não reporta se não há usuários
    }

    const reportUrl = `${OFFICIAL_INSTANCE_URL}/api/stats/report-users`;
    const url = new URL(reportUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const postData = JSON.stringify({
      count: count,
      instanceId: INSTANCE_ID
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'tmdb-addon-user-counter/1.0'
      },
      timeout: 5000 // 5 segundos de timeout
    };

    return new Promise((resolve, reject) => {
      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Successfully reported ${count} users to official instance`);
            resolve(true);
          } else {
            console.warn(`Failed to report users: ${res.statusCode} - ${data}`);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        // Não loga erro para não poluir logs, apenas falha silenciosamente
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    // Falha silenciosamente para não afetar a aplicação principal
    return false;
  }
}

/**
 * Inicia o reporte automático periódico para a instância oficial
 */
let reportInterval = null;

function startAutoReporting(intervalMinutes = 60) {
  // Se já está rodando, não inicia novamente
  if (reportInterval) {
    return;
  }

  // Se é a instância oficial, não precisa reportar
  if (isOfficialInstance()) {
    return;
  }

  // Reporta imediatamente na primeira vez
  reportToOfficialInstance().catch(() => {});

  // Depois reporta periodicamente
  const intervalMs = intervalMinutes * 60 * 1000;
  reportInterval = setInterval(() => {
    reportToOfficialInstance().catch(() => {});
  }, intervalMs);

  console.log(`Auto-reporting to official instance enabled (every ${intervalMinutes} minutes)`);
}

function stopAutoReporting() {
  if (reportInterval) {
    clearInterval(reportInterval);
    reportInterval = null;
  }
}

module.exports = {
  trackUser,
  getUserCount,
  getAggregatedUserCount,
  trackExternalUsers,
  resetUserCount,
  getClientIP,
  reportToOfficialInstance,
  startAutoReporting,
  stopAutoReporting,
  isOfficialInstance,
  INSTANCE_ID
};

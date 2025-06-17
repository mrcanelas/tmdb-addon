require('dotenv').config();
const swaggerStats = require('swagger-stats');
const express = require('express');
const Redis = require('ioredis'); // Redis dependency
const packageJson = require("../../package.json");

class Analytics {
    static instance;
    constructor() {
        if (!Analytics.instance) {
            this.app = express();

            // Validar URI do Redis
            const redisUri = process.env.REDIS_URL;
            if (!redisUri || !redisUri.startsWith('redis://')) {
                throw new Error('URI do Redis inválida ou não configurada. Verifique a variável de ambiente REDIS_URI');
            }

            // Initialize Redis client
            this.redis = new Redis(redisUri);

            this.middleware = swaggerStats.getMiddleware({
                name: packageJson.name,
                version: packageJson.version,
                timelineBucketDuration: 60000,
                uriPath: '/stats/ui',
                authentication: true,
                onAuthenticate: (req, username, password) => {
                  return username === process.env.METRICS_USER
                      && password === process.env.METRICS_PASSWORD
                },
                // No MongoDB option anymore, we'll handle data in Redis
                swaggerSpec: {
                    info: {
                        title: 'TMDB Addon API',
                        version: packageJson.version
                    }
                }
            });
            this.app.use(this.middleware);

            // Create Redis keys if not exist
            this.createStatsKeys();

            Analytics.instance = this;
        }
        return Analytics.instance;
    }

    // Initialize Redis keys for storing stats
    async createStatsKeys() {
        try {
            // Set default stats if they don't exist
            const statsKey = 'stats_requests';
            const userKey = 'unique_users';

            // Check if stats exist, otherwise create them
            const stats = await this.redis.hgetall(statsKey);
            if (!stats || Object.keys(stats).length === 0) {
                await this.redis.hset(statsKey, 'totalRequests', 0, 'successRequests', 0, 'errorRequests', 0, 'last60', 0);
            }

            // Check unique users list
            const users = await this.redis.smembers(userKey);
            if (!users || users.length === 0) {
                await this.redis.sadd(userKey, '127.0.0.1');
            }
        } catch (error) {
            console.error('Erro ao inicializar Redis:', error);
        }
    }

    // Track unique users
    async trackUser(ip) {
        const userKey = 'unique_users';
        await this.redis.sadd(userKey, ip); // Store unique IPs in Redis Set
    }

    // Get unique users count
    async getUniqueUsers() {
        try {
            const uniqueUsersCount = await this.redis.scard('unique_users');
            return { uniqueUserCount: uniqueUsersCount };
        } catch (error) {
            console.error('Erro ao obter usuários únicos:', error);
            return { uniqueUserCount: 0 };
        }
    }

    // Get stats data from Redis
    async getStats() {
        try {
            const statsKey = 'stats_requests';
            const stats = await this.redis.hgetall(statsKey);

            const totalRequests = parseInt(stats.totalRequests || 0, 10);
            const successRequests = parseInt(stats.successRequests || 0, 10);
            const errorRequests = parseInt(stats.errorRequests || 0, 10);
            const last60 = parseInt(stats.last60 || 0, 10);

            return {
                requests: { total: totalRequests },
                responses: {
                    '2xx': successRequests,
                    '4xx': errorRequests,
                    '5xx': 0
                },
                timeline: { last60 }
            };
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return {
                requests: { total: 0 },
                responses: { '2xx': 0, '4xx': 0, '5xx': 0 },
                timeline: { last60: 0 }
            };
        }
    }

    // Increment request counters
    async incrementRequestStats(statusCode) {
        try {
            const statsKey = 'stats_requests';
            await this.redis.hincrby(statsKey, 'totalRequests', 1);

            if (statusCode >= 200 && statusCode < 300) {
                await this.redis.hincrby(statsKey, 'successRequests', 1);
            } else if (statusCode >= 400 && statusCode < 500) {
                await this.redis.hincrby(statsKey, 'errorRequests', 1);
            }

            if (new Date() - (await this.redis.hget(statsKey, 'last60')) <= 60000) {
                await this.redis.hincrby(statsKey, 'last60', 1);
            }
        } catch (error) {
            console.error('Erro ao incrementar estatísticas:', error);
        }
    }
}

module.exports = new Analytics();
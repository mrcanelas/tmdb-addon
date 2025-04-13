require('dotenv').config();
const swaggerStats = require('swagger-stats');
const express = require('express');
const { MongoClient } = require('mongodb');
const packageJson = require("../../package.json");

class Analytics {
    static instance;
    constructor() {
        if (!Analytics.instance) {
            this.app = express();
            
            // Validar URI do MongoDB
            const mongodbUri = process.env.MONGODB_METRICS;
            if (!mongodbUri || !mongodbUri.startsWith('mongodb://') && !mongodbUri.startsWith('mongodb+srv://')) {
                throw new Error('URI do MongoDB inválida ou não configurada. Verifique a variável de ambiente MONGODB_METRICS');
            }

            this.middleware = swaggerStats.getMiddleware({
                name: 'TMDB Addon',
                version: '3.1.3',
                timelineBucketDuration: 60000,
                uriPath: '/stats/ui',
                authentication: false,
                onAuthenticate: (req, username, password) => {
                    return true;
                },
                elasticsearch: false,
                mongodb: {
                    uri: mongodbUri,
                    collectionPrefix: 'stats_'
                },
                swaggerSpec: {
                    info: {
                        title: 'TMDB Addon API',
                        version: '3.1.3'
                    }
                }
            });
            this.app.use(this.middleware);
            
            // Configurar conexão com MongoDB
            this.client = new MongoClient(mongodbUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            
            // Conectar ao MongoDB e criar coleção se não existir
            this.client.connect().then(async () => {
                const db = this.client.db();
                const collections = await db.listCollections().toArray();
                const collectionExists = collections.some(c => c.name === 'stats_requests');
                
                if (!collectionExists) {
                    console.log('Criando coleção stats_requests...');
                    await db.createCollection('stats_requests');
                    // Inserir um documento vazio para inicializar a coleção
                    await db.collection('stats_requests').insertOne({
                        ip: '127.0.0.1',
                        ts: new Date(),
                        status: 200
                    });
                }
            }).catch(err => {
                console.error('Erro ao conectar ao MongoDB:', err);
            });
            
            Analytics.instance = this;
        }
        return Analytics.instance;
    }

    async getUniqueUsers() {
        try {
            if (!this.client) {
                console.error('Cliente MongoDB não está inicializado');
                return { uniqueUserCount: 0 };
            }

            const db = this.client.db();
            const collection = db.collection('stats_requests');
            
            // Verificar se a coleção existe
            const collections = await db.listCollections().toArray();
            const collectionExists = collections.some(c => c.name === 'stats_requests');
            
            if (!collectionExists) {
                console.log('Coleção stats_requests não existe ainda');
                return { uniqueUserCount: 0 };
            }

            const result = await collection.aggregate([
                {
                    $group: {
                        _id: "$ip",
                        lastSeen: { $max: "$ts" }
                    }
                },
                {
                    $count: "uniqueUserCount"
                }
            ]).toArray();

            return { uniqueUserCount: result[0]?.uniqueUserCount || 0 };
        } catch (error) {
            console.error('Erro ao obter usuários únicos:', error);
            return { uniqueUserCount: 0 };
        }
    }

    async getStats() {
        try {
            if (!this.client) {
                console.error('Cliente MongoDB não está inicializado');
                return {
                    requests: { total: 0 },
                    responses: { '2xx': 0, '4xx': 0, '5xx': 0 },
                    timeline: { last60: 0 }
                };
            }

            const db = this.client.db();
            const collection = db.collection('stats_requests');
            
            // Verificar se a coleção existe
            const collections = await db.listCollections().toArray();
            const collectionExists = collections.some(c => c.name === 'stats_requests');
            
            if (!collectionExists) {
                console.log('Coleção stats_requests não existe ainda');
                return {
                    requests: { total: 0 },
                    responses: { '2xx': 0, '4xx': 0, '5xx': 0 },
                    timeline: { last60: 0 }
                };
            }

            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRequests: { $sum: 1 },
                        successRequests: {
                            $sum: {
                                $cond: [{ $gte: ["$status", 200] }, 1, 0]
                            }
                        },
                        errorRequests: {
                            $sum: {
                                $cond: [{ $gte: ["$status", 400] }, 1, 0]
                            }
                        },
                        last60: {
                            $sum: {
                                $cond: [
                                    { $gte: ["$ts", new Date(Date.now() - 60000)] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]).toArray();

            const result = stats[0] || {
                totalRequests: 0,
                successRequests: 0,
                errorRequests: 0,
                last60: 0
            };

            return {
                requests: { total: result.totalRequests },
                responses: {
                    '2xx': result.successRequests,
                    '4xx': result.errorRequests,
                    '5xx': 0
                },
                timeline: { last60: result.last60 }
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
}

module.exports = new Analytics(); 
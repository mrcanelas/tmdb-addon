import type { FastifyPluginAsync } from 'fastify';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { METALAYER } = require('@metalayer/identity') as {
  METALAYER: { version: string; manifestName: string };
};

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request) => {
    return {
      status: 'ok',
      service: 'metalayer-api',
      name: METALAYER.manifestName,
      version: METALAYER.version,
      correlationId: request.correlationId,
    };
  });
};

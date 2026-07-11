import type { FastifyPluginAsync } from 'fastify';

export const pingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ping', async (request) => {
    return {
      pong: true,
      correlationId: request.correlationId,
    };
  });
};

import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

const correlationPluginImpl: FastifyPluginAsync = async (app) => {
  app.decorateRequest('correlationId', '');

  app.addHook('onRequest', async (request) => {
    const incoming = request.headers['x-correlation-id'];
    const value = Array.isArray(incoming) ? incoming[0] : incoming;
    request.correlationId =
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : randomUUID();
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-correlation-id', request.correlationId);
    return payload;
  });
};

/** Break encapsulation so request.correlationId is visible to all routes. */
export const correlationPlugin = fp(correlationPluginImpl, {
  name: 'metalayer-correlation',
});

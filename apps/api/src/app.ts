import Fastify from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import { correlationPlugin } from './plugins/correlation.js';
import { apiV1Routes } from './routes/api-v1.js';

export async function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  await app.register(correlationPlugin);

  await app.register(apiV1Routes, { prefix: '/api/v1' });

  app.setNotFoundHandler((request, reply) => {
    const error = createApiError({
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${request.method} ${request.url}`,
      correlationId: request.correlationId,
      params: {
        method: request.method,
        path: request.url,
      },
    });
    return reply.status(404).send(error);
  });

  app.setErrorHandler((err, request, reply) => {
    request.log.error(err);
    const error = createApiError({
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unexpected error',
      correlationId: request.correlationId ?? 'unknown',
    });
    return reply.status(500).send(error);
  });

  return app;
}

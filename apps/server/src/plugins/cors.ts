import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const corsPluginImpl: FastifyPluginAsync = async (app) => {
  const origin = process.env.METALAYER_CORS_ORIGIN || '*';

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type, X-MetaLayer-Edit-Credential, X-Correlation-Id',
    );
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });
};

export const corsPlugin = fp(corsPluginImpl, {
  name: 'metalayer-cors',
});

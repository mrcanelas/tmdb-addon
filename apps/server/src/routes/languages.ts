import type { FastifyPluginAsync } from 'fastify';
import { listMetadataLanguages } from '@metalayer/config';

/**
 * Catalog of BCP 47 metadata locales for Configure Field Resolution Chains.
 * Static fallback (legacy getLanguages without a live TMDB round-trip).
 */
export const languagesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/languages', async (request) => {
    return {
      languages: listMetadataLanguages(),
      correlationId: request.correlationId,
    };
  });
};

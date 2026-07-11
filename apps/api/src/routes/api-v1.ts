import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { pingRoutes } from './ping.js';
import { configurationsRoutes } from './configurations.js';
import { sourcesRoutes } from './sources.js';
import { previewRoutes } from './preview.js';

/**
 * Versioned management API surface (AGENTS.md §27.2).
 */
export const apiV1Routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(pingRoutes);
  await app.register(configurationsRoutes);
  await app.register(sourcesRoutes);
  await app.register(previewRoutes);
};

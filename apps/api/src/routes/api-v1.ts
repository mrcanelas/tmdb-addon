import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { pingRoutes } from './ping.js';

/**
 * Versioned management API surface (AGENTS.md §27.2).
 * Stremio protocol routes will live alongside this under /c/:configId later.
 */
export const apiV1Routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(pingRoutes);
};

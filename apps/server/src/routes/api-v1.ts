import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { pingRoutes } from './ping.js';
import { configurationsRoutes } from './configurations.js';
import { sourcesRoutes } from './sources.js';
import { previewRoutes } from './preview.js';
import { catalogsRoutes } from './catalogs.js';
import { rulesSortingRoutes } from './rules-sorting.js';
import { inspectRoutes } from './inspect.js';
import { identityRoutes } from './identity.js';
import { trackingRoutes } from './tracking.js';
import { correctionsRoutes } from './corrections.js';
import { searchAiRoutes } from './search-ai.js';
import { dashboardRoutes } from './dashboard.js';
import { resolutionRoutes } from './resolution.js';
import { localizationRoutes } from './localization.js';
import { profilesRoutes } from './profiles.js';

/**
 * Versioned management API surface (AGENTS.md §27.2).
 */
export const apiV1Routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(pingRoutes);
  await app.register(configurationsRoutes);
  await app.register(catalogsRoutes);
  await app.register(rulesSortingRoutes);
  await app.register(inspectRoutes);
  await app.register(resolutionRoutes);
  await app.register(localizationRoutes);
  await app.register(profilesRoutes);
  await app.register(identityRoutes);
  await app.register(trackingRoutes);
  await app.register(correctionsRoutes);
  await app.register(searchAiRoutes);
  await app.register(dashboardRoutes);
  await app.register(sourcesRoutes);
  await app.register(previewRoutes);
};

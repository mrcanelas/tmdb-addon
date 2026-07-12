import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createRequire } from 'node:module';
import { createApiError } from '@metalayer/api-errors';
import {
  RUNTIME_SETTINGS,
  buildHealthSnapshot,
  buildSafeBackup,
  resolveDeploymentMode,
  safeTokenEquals,
} from '@metalayer/observability';

const require = createRequire(import.meta.url);
const { METALAYER } = require('@metalayer/identity') as {
  METALAYER: { version: string; manifestName: string };
};

function readDashboardToken(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-dashboard-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

function requireOperator(
  request: FastifyRequest,
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; status: number; body: unknown } {
  const expected = env.METALAYER_DASHBOARD_TOKEN?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      body: createApiError({
        code: 'DASHBOARD_TOKEN_MISSING',
        message: 'METALAYER_DASHBOARD_TOKEN is not configured',
        correlationId: request.correlationId,
      }),
    };
  }
  const provided = readDashboardToken(request);
  if (!provided || !safeTokenEquals(provided, expected)) {
    return {
      ok: false,
      status: 401,
      body: createApiError({
        code: 'DASHBOARD_UNAUTHORIZED',
        message: 'Dashboard token is invalid',
        correlationId: request.correlationId,
      }),
    };
  }
  return { ok: true };
}

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard/overview', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const configIds = await app.configStore.listConfigIds();
    const health = buildHealthSnapshot({
      metrics: app.metrics,
      version: METALAYER.version,
      startedAt: app.startedAt,
      activeConfigurations: configIds.length,
    });

    return {
      health,
      modules: [
        'overview',
        'health',
        'providers',
        'configurations',
        'requests',
        'errors',
        'cache',
        'database',
        'workers',
        'logs',
        'security',
        'backups',
        'updates',
        'settings',
      ],
      correlationId: request.correlationId,
    };
  });

  app.get('/dashboard/health', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);

    return {
      health: buildHealthSnapshot({
        metrics: app.metrics,
        version: METALAYER.version,
        startedAt: app.startedAt,
        activeConfigurations: (await app.configStore.listConfigIds()).length,
      }),
      correlationId: request.correlationId,
    };
  });

  app.get('/dashboard/metrics', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);
    return {
      metrics: app.metrics.snapshot(),
      correlationId: request.correlationId,
    };
  });

  app.get<{ Querystring: { level?: string; limit?: string; correlationId?: string } }>(
    '/dashboard/logs',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const level = request.query.level as 'info' | 'warn' | 'error' | undefined;
      const limit = request.query.limit ? Number(request.query.limit) : 50;
      return {
        logs: app.logBuffer.list({
          level: level === 'info' || level === 'warn' || level === 'error' ? level : undefined,
          limit: Number.isFinite(limit) ? limit : 50,
          correlationId: request.query.correlationId,
        }),
        correlationId: request.correlationId,
      };
    },
  );

  app.get('/dashboard/configurations', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const configIds = await app.configStore.listConfigIds();
    const configurations = await Promise.all(
      configIds.map(async (configId) => {
        const view = (await app.configStore.getPublic(configId))!;
        return {
          configId,
          name: view.config.name,
          updatedAt: view.updatedAt,
          catalogCount: view.config.catalogs.length,
          secretStates: view.secrets,
          manifestPath: view.manifestPath,
        };
      }),
    );

    return { configurations, correlationId: request.correlationId };
  });

  app.get('/dashboard/settings', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);
    return {
      settings: RUNTIME_SETTINGS,
      mode: resolveDeploymentMode(),
      correlationId: request.correlationId,
    };
  });

  app.post('/dashboard/backups', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const backupConfigIds = await app.configStore.listConfigIds();
    const configurations = (
      await Promise.all(
        backupConfigIds.map((configId) => app.configStore.exportSafe(configId)),
      )
    ).filter(Boolean);

    const backup = buildSafeBackup({
      version: METALAYER.version,
      mode: resolveDeploymentMode(),
      configurations,
    });

    app.logBuffer.append({
      level: 'info',
      message: 'Operator backup created',
      correlationId: request.correlationId,
      context: { count: configurations.length },
    });

    return { backup, correlationId: request.correlationId };
  });

  app.get('/dashboard/updates', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);

    return {
      currentVersion: METALAYER.version,
      channel: '1.0.0-alpha',
      upgradeCommand: 'pnpm metalayer:upgrade-check',
      notes: [
        'Alpha builds may include breaking schema changes.',
        'Back up configurations before upgrading.',
        'Keep METALAYER_ENCRYPTION_KEY stable across upgrades.',
      ],
      correlationId: request.correlationId,
    };
  });
};

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createRequire } from 'node:module';
import { createApiError } from '@metalayer/api-errors';
import {
  buildHealthSnapshot,
  buildSafeBackup,
  resolveDeploymentMode,
  safeTokenEquals,
} from '@metalayer/observability';
import { getProvider } from '@metalayer/providers';
import type { SecretKind } from '@metalayer/persistence';

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

function parseSecretKind(value: string): SecretKind | null {
  return value === 'api_key' ||
    value === 'client_id' ||
    value === 'client_secret' ||
    value === 'oauth_access' ||
    value === 'oauth_refresh' ||
    value === 'session'
    ? value
    : null;
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
      providers: app.providerHealth.snapshotAll(),
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
    const settings = app.runtimeSettings.list();
    return {
      settings,
      mode: resolveDeploymentMode(),
      restartPending: settings.some((setting) => setting.restartRequired),
      correlationId: request.correlationId,
    };
  });

  app.put<{ Params: { key: string }; Body: { value?: unknown } }>(
    '/dashboard/settings/:key',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);
      try {
        const result = await app.runtimeSettings.set(
          request.params.key,
          request.body?.value,
        );
        return {
          setting: result.setting,
          restartRequired: result.restartRequired,
          correlationId: request.correlationId,
        };
      } catch (error) {
        const rawCode =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code: unknown }).code)
            : 'VALIDATION_FAILED';
        const code =
          rawCode === 'SETTING_NOT_FOUND'
            ? 'CONFIGURATION_NOT_FOUND'
            : rawCode === 'SETTING_NOT_EDITABLE'
              ? 'VALIDATION_FAILED'
              : 'VALIDATION_FAILED';
        const status = code === 'CONFIGURATION_NOT_FOUND' ? 404 : 400;
        return reply.status(status).send(
          createApiError({
            code,
            message: error instanceof Error ? error.message : 'Invalid setting',
            correlationId: request.correlationId,
            params: { key: request.params.key },
          }),
        );
      }
    },
  );

  app.delete<{ Params: { key: string } }>(
    '/dashboard/settings/:key',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);
      try {
        const result = await app.runtimeSettings.clear(request.params.key);
        return {
          setting: result.setting,
          restartRequired: result.restartRequired,
          correlationId: request.correlationId,
        };
      } catch (error) {
        const rawCode =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code: unknown }).code)
            : 'VALIDATION_FAILED';
        const code =
          rawCode === 'SETTING_NOT_FOUND'
            ? 'CONFIGURATION_NOT_FOUND'
            : 'VALIDATION_FAILED';
        const status = code === 'CONFIGURATION_NOT_FOUND' ? 404 : 400;
        return reply.status(status).send(
          createApiError({
            code,
            message: error instanceof Error ? error.message : 'Invalid setting',
            correlationId: request.correlationId,
            params: { key: request.params.key },
          }),
        );
      }
    },
  );

  app.get('/dashboard/providers', async (request, reply) => {
    const access = requireOperator(request);
    if (!access.ok) return reply.status(access.status).send(access.body);
    return {
      providers: app.instanceProviders.list(),
      secretStates: await app.configStore.listInstanceSecretStates(),
      correlationId: request.correlationId,
    };
  });

  app.put<{ Params: { providerId: string }; Body: { enabled?: boolean; configured?: boolean } }>(
    '/dashboard/providers/:providerId',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);
      if (!getProvider(request.params.providerId)) {
        return reply.status(404).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${request.params.providerId} was not found`,
            correlationId: request.correlationId,
            params: { provider: request.params.providerId },
          }),
        );
      }

      const state = await app.configStore.setInstanceProviderState(
        request.params.providerId,
        {
          enabled: request.body?.enabled,
          configured: request.body?.configured,
        },
      );

      return {
        provider: app.instanceProviders.update(request.params.providerId, state),
        correlationId: request.correlationId,
      };
    },
  );

  app.put<{
    Params: { providerId: string; kind: string };
    Body: { plaintext?: string };
  }>(
    '/dashboard/providers/:providerId/secrets/:kind',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);
      if (!getProvider(request.params.providerId)) {
        return reply.status(404).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${request.params.providerId} was not found`,
            correlationId: request.correlationId,
            params: { provider: request.params.providerId },
          }),
        );
      }
      const kind = parseSecretKind(request.params.kind);
      if (!kind || !request.body?.plaintext) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid provider secret payload',
            correlationId: request.correlationId,
            params: { field: 'kind' },
          }),
        );
      }

      await app.configStore.upsertInstanceVaultSecret(
        request.params.providerId,
        kind,
        request.body.plaintext,
      );
      const state = await app.configStore.setInstanceProviderState(
        request.params.providerId,
        { configured: true },
      );

      return {
        provider: app.instanceProviders.update(request.params.providerId, state),
        secretStates: await app.configStore.listInstanceSecretStates(),
        correlationId: request.correlationId,
      };
    },
  );

  app.delete<{ Params: { providerId: string; kind: string } }>(
    '/dashboard/providers/:providerId/secrets/:kind',
    async (request, reply) => {
      const access = requireOperator(request);
      if (!access.ok) return reply.status(access.status).send(access.body);
      const kind = parseSecretKind(request.params.kind);
      if (!kind) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid provider secret kind',
            correlationId: request.correlationId,
            params: { field: 'kind' },
          }),
        );
      }

      await app.configStore.deleteInstanceVaultSecret(request.params.providerId, kind);
      return {
        secretStates: await app.configStore.listInstanceSecretStates(),
        correlationId: request.correlationId,
      };
    },
  );

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

import type { FastifyPluginAsync } from 'fastify';
import {
  createDefaultMetaLayerConfig,
  parseMetaLayerConfig,
  planLegacyImport,
  toPublicImportPlan,
} from '@metalayer/config';
import { createApiError } from '@metalayer/api-errors';
import type { ConfigurationStore } from '@metalayer/persistence';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

type CreateBody = {
  name?: string;
  editCredential?: string;
  secrets?: Record<string, string>;
  config?: unknown;
};

type ImportLegacyBody = {
  name?: string;
  editCredential?: string;
  legacy?: unknown;
  /** When true, only return the import report — do not persist. */
  dryRun?: boolean;
};

export const configurationsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CreateBody }>('/configurations', async (request, reply) => {
    const body = request.body ?? {};
    if (!body.editCredential || body.editCredential.length < 8) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'editCredential must be at least 8 characters',
          correlationId: request.correlationId,
          params: { field: 'editCredential' },
        }),
      );
    }

    let config;
    try {
      config = body.config
        ? parseMetaLayerConfig(body.config)
        : createDefaultMetaLayerConfig({ name: body.name || 'Default' });
      if (body.name) {
        config = { ...config, name: body.name };
      }
    } catch {
      return reply.status(400).send(
        createApiError({
          code: 'CONFIGURATION_INVALID',
          message: 'Configuration payload failed schema validation',
          correlationId: request.correlationId,
        }),
      );
    }

    const created = app.configStore.create({
      config,
      editCredential: body.editCredential,
      secrets: body.secrets,
    });

    return reply.status(201).send({
      configId: created.configId,
      manifestPath: created.manifestPath,
      config: created.config,
      secrets: created.secrets,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      correlationId: request.correlationId,
    });
  });

  app.post<{ Body: ImportLegacyBody }>('/configurations/import-legacy', async (request, reply) => {
    const body = request.body ?? {};
    if (body.legacy === undefined || body.legacy === null) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'legacy configuration payload is required',
          correlationId: request.correlationId,
          params: { field: 'legacy' },
        }),
      );
    }

    let plan;
    try {
      plan = planLegacyImport(body.legacy, { name: body.name });
    } catch {
      return reply.status(400).send(
        createApiError({
          code: 'LEGACY_IMPORT_FAILED',
          message: 'Could not parse legacy TMDB Addon configuration',
          correlationId: request.correlationId,
        }),
      );
    }

    const publicPlan = toPublicImportPlan(plan);

    if (body.dryRun) {
      return {
        dryRun: true,
        ...publicPlan,
        correlationId: request.correlationId,
      };
    }

    if (!body.editCredential || body.editCredential.length < 8) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'editCredential must be at least 8 characters to persist an import',
          correlationId: request.correlationId,
          params: { field: 'editCredential' },
        }),
      );
    }

    const created = app.configStore.create({
      config: plan.config,
      editCredential: body.editCredential,
      secrets: plan.secrets,
    });

    return reply.status(201).send({
      dryRun: false,
      configId: created.configId,
      manifestPath: created.manifestPath,
      config: created.config,
      secrets: created.secrets,
      report: publicPlan.report,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      correlationId: request.correlationId,
    });
  });

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId',
    async (request, reply) => {
      const editCredential = request.headers['x-metalayer-edit-credential'];
      const credential = Array.isArray(editCredential) ? editCredential[0] : editCredential;

      if (!credential) {
        return reply.status(401).send(
          createApiError({
            code: 'EDIT_CREDENTIAL_INVALID',
            message: 'Missing X-MetaLayer-Edit-Credential header',
            correlationId: request.correlationId,
          }),
        );
      }

      const { configId } = request.params;
      if (!app.configStore.verifyEditAccess(configId, credential)) {
        const exists = app.configStore.getPublic(configId);
        if (!exists) {
          return reply.status(404).send(
            createApiError({
              code: 'CONFIGURATION_NOT_FOUND',
              message: `Configuration ${configId} was not found`,
              correlationId: request.correlationId,
              params: { configId },
            }),
          );
        }
        return reply.status(401).send(
          createApiError({
            code: 'EDIT_CREDENTIAL_INVALID',
            message: 'Edit credential is invalid',
            correlationId: request.correlationId,
          }),
        );
      }

      const view = app.configStore.getPublic(configId)!;
      return {
        ...view,
        correlationId: request.correlationId,
      };
    },
  );
};

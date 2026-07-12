import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
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
  dryRun?: boolean;
};

type UpdateBody = {
  config?: unknown;
  name?: string;
  note?: string;
  secrets?: Record<string, string>;
};

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

async function requireEditAccess(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  reply: FastifyReply,
  configId: string,
): Promise<boolean> {
  const credential = readEditCredential(request);
  if (!credential) {
    await reply.status(401).send(
      createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Missing X-MetaLayer-Edit-Credential header',
        correlationId: request.correlationId,
      }),
    );
    return false;
  }

  if (!await app.configStore.verifyEditAccess(configId, credential)) {
    const exists = await app.configStore.getPublic(configId);
    if (!exists) {
      await reply.status(404).send(
        createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Configuration ${configId} was not found`,
          correlationId: request.correlationId,
          params: { configId },
        }),
      );
      return false;
    }
    await reply.status(401).send(
      createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Edit credential is invalid',
        correlationId: request.correlationId,
      }),
    );
    return false;
  }

  return true;
}

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

    const created = await app.configStore.create({
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

    const created = await app.configStore.create({
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

  app.put<{ Params: { configId: string }; Body: UpdateBody }>(
    '/configurations/:configId',
    async (request, reply) => {
      const { configId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;

      const body = request.body ?? {};
      let config;
      try {
        config = body.config
          ? parseMetaLayerConfig(body.config)
          : (await app.configStore.getPublic(configId))!.config;
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

      const updated = await app.configStore.update(configId, {
        config,
        note: body.note,
        secrets: body.secrets,
      });

      return {
        ...updated,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId',
    async (request, reply) => {
      const { configId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;
      const view = (await app.configStore.getPublic(configId))!;
      return {
        ...view,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/revisions',
    async (request, reply) => {
      const { configId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;
      return {
        configId,
        revisions: await app.configStore.listRevisions(configId),
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string; revisionId: string } }>(
    '/configurations/:configId/revisions/:revisionId',
    async (request, reply) => {
      const { configId, revisionId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;
      const revision = await app.configStore.getRevision(configId, revisionId);
      if (!revision) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Revision ${revisionId} was not found`,
            correlationId: request.correlationId,
            params: { configId, revisionId },
          }),
        );
      }
      return {
        configId,
        revision,
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{ Params: { configId: string; revisionId: string }; Body: { note?: string } }>(
    '/configurations/:configId/revisions/:revisionId/restore',
    async (request, reply) => {
      const { configId, revisionId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;
      const restored = await app.configStore.restoreRevision(
        configId,
        revisionId,
        request.body?.note,
      );
      if (!restored) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Revision ${revisionId} was not found`,
            correlationId: request.correlationId,
            params: { configId, revisionId },
          }),
        );
      }
      return {
        ...restored,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/export',
    async (request, reply) => {
      const { configId } = request.params;
      if (!(await requireEditAccess(app, request, reply, configId))) return;
      const exported = await app.configStore.exportSafe(configId);
      if (!exported) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Configuration ${configId} was not found`,
            correlationId: request.correlationId,
            params: { configId },
          }),
        );
      }
      return {
        ...exported,
        correlationId: request.correlationId,
      };
    },
  );
};

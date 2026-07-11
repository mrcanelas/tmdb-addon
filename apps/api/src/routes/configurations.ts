import type { FastifyPluginAsync } from 'fastify';
import { createDefaultMetaLayerConfig, parseMetaLayerConfig } from '@metalayer/config';
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

    // Never echo editCredential or plaintext secrets.
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

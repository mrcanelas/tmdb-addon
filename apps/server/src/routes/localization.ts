import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  LocalizationPreferencesSchema,
  type LocalizationPreferences,
} from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

async function requireEdit(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  configId: string,
) {
  const credential = readEditCredential(request);
  if (!credential || !await app.configStore.verifyEditAccess(configId, credential)) {
    const exists = await app.configStore.getPublic(configId);
    if (!exists) {
      return {
        ok: false as const,
        status: 404,
        body: createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Configuration ${configId} was not found`,
          correlationId: request.correlationId,
          params: { configId },
        }),
      };
    }
    return {
      ok: false as const,
      status: 401,
      body: createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Edit credential is invalid',
        correlationId: request.correlationId,
      }),
    };
  }
  return { ok: true as const };
}

export const localizationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/localization',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = (await app.configStore.getPublic(request.params.configId))!;
      return {
        localization: view.config.localization,
        correlationId: request.correlationId,
      };
    },
  );

  app.put<{
    Params: { configId: string };
    Body: { localization: unknown; note?: string };
  }>('/configurations/:configId/localization', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    let parsed: LocalizationPreferences;
    try {
      parsed = LocalizationPreferencesSchema.parse(request.body?.localization);
    } catch {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid localization preferences',
          correlationId: request.correlationId,
          params: { field: 'localization' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        localization: parsed,
        updatedAt: new Date().toISOString(),
      },
      note: request.body?.note ?? 'localization:update',
    });

    return {
      localization: updated!.config.localization,
      correlationId: request.correlationId,
    };
  });
};

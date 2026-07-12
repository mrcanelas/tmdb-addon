import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  ProfileDefinitionSchema,
  type ProfileDefinition,
} from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

function requireEdit(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  configId: string,
) {
  const credential = readEditCredential(request);
  if (!credential || !app.configStore.verifyEditAccess(configId, credential)) {
    const exists = app.configStore.getPublic(configId);
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

const ProfilesBodySchema = ProfileDefinitionSchema.array();

export const profilesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/profiles',
    async (request, reply) => {
      const access = requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = app.configStore.getPublic(request.params.configId)!;
      return {
        profiles: view.config.profiles ?? [],
        correlationId: request.correlationId,
      };
    },
  );

  app.put<{
    Params: { configId: string };
    Body: { profiles: unknown; note?: string };
  }>('/configurations/:configId/profiles', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    let parsed: ProfileDefinition[];
    try {
      parsed = ProfilesBodySchema.parse(request.body?.profiles ?? []);
    } catch {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid profiles payload',
          correlationId: request.correlationId,
          params: { field: 'profiles' },
        }),
      );
    }

    const ids = parsed.map((profile) => profile.profileId);
    if (new Set(ids).size !== ids.length) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Duplicate profileId values are not allowed',
          correlationId: request.correlationId,
          params: { field: 'profileId' },
        }),
      );
    }

    const view = app.configStore.getPublic(request.params.configId)!;
    const updated = app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        profiles: parsed,
        updatedAt: new Date().toISOString(),
      },
      note: request.body?.note ?? 'profiles:update',
    });

    return {
      profiles: updated!.config.profiles ?? [],
      correlationId: request.correlationId,
    };
  });
};

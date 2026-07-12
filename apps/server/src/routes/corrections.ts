import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  CorrectionValidationError,
  applyMetadataCorrections,
  applyModeration,
  filterCorrectionsForTarget,
  remapEpisode,
  toIdentityCorrectionStubs,
  type CorrectionType,
  type MetadataCorrection,
  type ModerationAction,
} from '@metalayer/corrections';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { CorrectionRegistry } from '@metalayer/corrections';

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

function publicCorrection(item: MetadataCorrection) {
  return {
    id: item.id,
    schemaVersion: item.schemaVersion,
    target: item.target,
    type: item.type,
    payload: item.payload,
    reason: item.reason,
    sources: item.sources,
    author: item.author,
    status: item.status,
    scope: item.scope,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    supersededBy: item.supersededBy,
  };
}

export const correctionsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/corrections', async (request) => {
    return {
      corrections: app.correctionRegistry.listCommunity().map(publicCorrection),
      correlationId: request.correlationId,
    };
  });

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/corrections',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const registry = app.correctionRegistry;
      return {
        local: registry.listLocal(request.params.configId).map(publicCorrection),
        community: registry.listCommunity().map(publicCorrection),
        resolved: registry.listResolved(request.params.configId).map(publicCorrection),
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string };
    Body: {
      target: MetadataCorrection['target'];
      type: CorrectionType;
      payload: unknown;
      reason: string;
      sources?: MetadataCorrection['sources'];
      author?: string;
      id?: string;
    };
  }>('/configurations/:configId/corrections', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const body = request.body;
    if (!body?.target || !body.type || body.payload === undefined || !body.reason) {
      return reply.status(400).send(
        createApiError({
          code: 'CORRECTION_INVALID',
          message: 'target, type, payload, and reason are required',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const created = app.correctionRegistry.upsertLocal(request.params.configId, {
        id: body.id,
        target: body.target,
        type: body.type,
        payload: body.payload,
        reason: body.reason,
        sources: body.sources?.length
          ? body.sources
          : [{ kind: 'manual', label: 'Local override' }],
        author: body.author,
      });
      return reply.status(201).send({
        correction: publicCorrection(created),
        correlationId: request.correlationId,
      });
    } catch (error) {
      if (error instanceof CorrectionValidationError) {
        const forbidden = error.issues.some((issue) => issue.code === 'FORBIDDEN_CONTENT');
        return reply.status(400).send(
          createApiError({
            code: forbidden ? 'CORRECTION_FORBIDDEN_CONTENT' : 'CORRECTION_INVALID',
            message: error.message,
            correlationId: request.correlationId,
            details: error.issues,
          }),
        );
      }
      throw error;
    }
  });

  app.patch<{
    Params: { configId: string; correctionId: string };
    Body: { action: ModerationAction['type']; replacementId?: string };
  }>('/configurations/:configId/corrections/:correctionId', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const actionType = request.body?.action;
    if (!actionType) {
      return reply.status(400).send(
        createApiError({
          code: 'CORRECTION_INVALID',
          message: 'action is required',
          correlationId: request.correlationId,
        }),
      );
    }

    const action: ModerationAction =
      actionType === 'supersede'
        ? { type: 'supersede', replacementId: request.body.replacementId ?? '' }
        : { type: actionType };

    if (action.type === 'supersede' && !action.replacementId) {
      return reply.status(400).send(
        createApiError({
          code: 'CORRECTION_INVALID',
          message: 'replacementId is required for supersede',
          correlationId: request.correlationId,
        }),
      );
    }

    const updated = applyModeration(
      app.correctionRegistry,
      request.params.configId,
      request.params.correctionId,
      action,
    );
    if (!updated) {
      return reply.status(404).send(
        createApiError({
          code: 'CORRECTION_NOT_FOUND',
          message: `Correction ${request.params.correctionId} was not found or transition is invalid`,
          correlationId: request.correlationId,
          params: { correctionId: request.params.correctionId },
        }),
      );
    }

    return {
      correction: publicCorrection(updated),
      correlationId: request.correlationId,
    };
  });

  app.delete<{ Params: { configId: string; correctionId: string } }>(
    '/configurations/:configId/corrections/:correctionId',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const removed = app.correctionRegistry.deleteLocal(
        request.params.configId,
        request.params.correctionId,
      );
      if (!removed) {
        return reply.status(404).send(
          createApiError({
            code: 'CORRECTION_NOT_FOUND',
            message: `Local correction ${request.params.correctionId} was not found`,
            correlationId: request.correlationId,
            params: { correctionId: request.params.correctionId },
          }),
        );
      }

      return {
        ok: true,
        rolledBack: request.params.correctionId,
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string };
    Body: {
      provider?: string;
      id?: string;
      base?: Record<string, unknown>;
      season?: number;
      episode?: number;
    };
  }>('/configurations/:configId/corrections/preview', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.body?.provider ?? 'imdb';
    const id = request.body?.id ?? 'tt0137523';
    const resolved = app.correctionRegistry.listResolved(request.params.configId);
    const forTarget = filterCorrectionsForTarget(resolved, provider, id);
    const applied = applyMetadataCorrections(request.body?.base ?? { title: 'Provider Title' }, forTarget);
    const episode =
      typeof request.body?.season === 'number' && typeof request.body?.episode === 'number'
        ? remapEpisode(request.body.season, request.body.episode, forTarget)
        : null;

    return {
      target: { provider, id },
      corrections: forTarget.map(publicCorrection),
      applied: applied.value,
      overlays: applied.overlays,
      hidden: applied.hidden,
      episode,
      identityStubs: toIdentityCorrectionStubs(forTarget).length,
      correlationId: request.correlationId,
    };
  });
};

export type { CorrectionRegistry };

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  ResolvableFieldSchema,
  parseResolutionConfig,
  resolutionConfigFromFieldProviders,
  type MetaLayerConfig,
  type ResolutionConfig,
} from '@metalayer/config';
import {
  compileResolutionPlan,
  resolveFieldFromPlan,
  type FieldContribution,
} from '@metalayer/metadata-resolver';
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

function resolveStoredResolution(config: MetaLayerConfig): ResolutionConfig {
  if (config.resolution) {
    try {
      return parseResolutionConfig(config.resolution);
    } catch {
      // fall through to derived
    }
  }
  return resolutionConfigFromFieldProviders(
    config.fieldProviders,
    config.localization.metadataLocale,
    config.localization.metadataFallbackLocales,
  );
}

/** Sync simple provider arrays from plans for legacy fieldProviders consumers. */
function fieldProvidersFromResolution(resolution: ResolutionConfig) {
  const out: Record<string, string[]> = {};
  for (const [field, plan] of Object.entries(resolution.defaults.fields)) {
    if (plan.strategy === 'explicit' && plan.steps) {
      const providers: string[] = [];
      for (const step of plan.steps) {
        if (!providers.includes(step.provider)) providers.push(step.provider);
      }
      if (providers.length) out[field] = providers;
      continue;
    }
    if (plan.providers?.length) out[field] = [...plan.providers];
  }
  return out;
}

export const resolutionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/resolution',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = (await app.configStore.getPublic(request.params.configId))!;
      const resolution = resolveStoredResolution(view.config);
      return {
        resolution,
        derived: !view.config.resolution,
        correlationId: request.correlationId,
      };
    },
  );

  app.put<{
    Params: { configId: string };
    Body: { resolution: unknown; note?: string };
  }>('/configurations/:configId/resolution', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    let parsed: ResolutionConfig;
    try {
      parsed = parseResolutionConfig(request.body?.resolution);
    } catch {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid resolution configuration',
          correlationId: request.correlationId,
          params: { field: 'resolution' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const syncedProviders = {
      ...view.config.fieldProviders,
      ...fieldProvidersFromResolution(parsed),
    };

    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        resolution: parsed,
        fieldProviders: syncedProviders,
        updatedAt: new Date().toISOString(),
      },
      note: request.body?.note ?? 'resolution:update',
    });

    return {
      resolution: updated!.config.resolution,
      fieldProviders: updated!.config.fieldProviders,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      field: string;
      mediaType?: 'movie' | 'series' | 'anime';
      profileId?: string;
      catalogId?: string;
    };
  }>('/configurations/:configId/resolution/compile', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const field = ResolvableFieldSchema.safeParse(request.body?.field);
    if (!field.success) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid field',
          correlationId: request.correlationId,
          params: { field: 'field' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const resolution = resolveStoredResolution(view.config);
    const effective = compileResolutionPlan({
      field: field.data,
      mediaType: request.body?.mediaType,
      resolution,
      fieldProviders: view.config.fieldProviders,
      metadataLocale: view.config.localization.metadataLocale,
      fallbackLocales: view.config.localization.metadataFallbackLocales,
    });

    return {
      effective,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      field: string;
      mediaType?: 'movie' | 'series' | 'anime';
      contributions?: Array<{
        provider: string;
        value?: unknown;
        locale?: string;
        confidence?: number;
      }>;
      originalLanguage?: string;
    };
  }>('/configurations/:configId/resolution/test', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const field = ResolvableFieldSchema.safeParse(request.body?.field);
    if (!field.success) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid field',
          correlationId: request.correlationId,
          params: { field: 'field' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const resolution = resolveStoredResolution(view.config);
    const effective = compileResolutionPlan({
      field: field.data,
      mediaType: request.body?.mediaType,
      resolution,
      fieldProviders: view.config.fieldProviders,
      metadataLocale: view.config.localization.metadataLocale,
      fallbackLocales: view.config.localization.metadataFallbackLocales,
    });

    const contributions = (request.body?.contributions ?? []) as FieldContribution<unknown>[];
    const result = resolveFieldFromPlan(contributions, effective, {
      originalLanguage: request.body?.originalLanguage,
    });

    return {
      status: result.value == null ? 'unresolved' : 'resolved',
      field: field.data,
      value: result.value,
      selectedProvider: result.selectedProvider,
      selectedLocale: result.selectedLocale,
      fallbackUsed: result.fallbackUsed,
      attempts: result.attempts,
      effectivePlanHash: result.effectivePlanHash,
      warnings: result.warnings,
      correlationId: request.correlationId,
    };
  });
};

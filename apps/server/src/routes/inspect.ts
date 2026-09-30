import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  FieldProvidersSchema,
  type FieldProviders,
} from '@metalayer/config';
import {
  buildInspectorReport,
  type FieldContribution,
  type MetaInspectorReport,
  type ProviderFieldBag,
} from '@metalayer/metadata-resolver';
import {
  buildIdentityDiagnostics,
  precedenceScore,
  resolveIdentityMapping,
} from '@metalayer/identity-graph';
import {
  ProviderError,
} from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';
import { gatherLiveBag } from '../stremio/gather-fields.js';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

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

type RawContribution = {
  provider: string;
  value?: unknown;
  locale?: string;
  confidence?: number;
};



function asBag(raw: Record<string, RawContribution[]>): ProviderFieldBag {
  const bag: ProviderFieldBag = {};
  for (const [key, items] of Object.entries(raw)) {
    (bag as Record<string, FieldContribution<unknown>[]>)[key] = items.map(
      (item) => ({
        provider: item.provider,
        value: item.value as never,
        locale: item.locale,
        confidence: item.confidence,
      }),
    );
  }
  return bag;
}

export const inspectRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/field-providers',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);
      const view = (await app.configStore.getPublic(request.params.configId))!;
      return {
        fieldProviders: view.config.fieldProviders,
        correlationId: request.correlationId,
      };
    },
  );

  app.put<{
    Params: { configId: string };
    Body: { fieldProviders: FieldProviders; note?: string };
  }>('/configurations/:configId/field-providers', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const parsed = FieldProvidersSchema.safeParse(request.body?.fieldProviders);
    if (!parsed.success) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Invalid fieldProviders',
          correlationId: request.correlationId,
          params: { field: 'fieldProviders' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        fieldProviders: parsed.data,
        updatedAt: new Date().toISOString(),
      },
      note: request.body?.note ?? 'field-providers:update',
    });

    return {
      fieldProviders: updated!.config.fieldProviders,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      id?: string;
      mediaType?: 'movie' | 'series' | 'anime';
      contributions?: Record<string, RawContribution[]>;
      apiKey?: string;
    };
  }>('/configurations/:configId/inspect', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const body = request.body ?? {};
    const mediaType = body.mediaType ?? 'movie';

    if (!body.contributions && !body.id) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'Provide id or contributions',
          correlationId: request.correlationId,
          params: { field: 'id' },
        }),
      );
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const started = Date.now();

    try {
      let bag: ProviderFieldBag;
      let publicId: string | undefined;

      if (body.contributions) {
        bag = asBag(body.contributions);
        publicId = body.id;
      } else {
        const live = await gatherLiveBag(app, view.config, {
          getSecret: provider => app.configStore.getSecretPlaintext(request.params.configId, provider),
          id: body.id!,
          mediaType,
          apiKey: body.apiKey,
          correlationId: request.correlationId,
        });
        bag = live.bag;
        publicId = live.publicId;
      }

      const report: MetaInspectorReport = buildInspectorReport({
        bag,
        fieldProviders: view.config.fieldProviders,
        resolution: view.config.resolution,
        mediaType,
        localization: view.config.localization,
        identity: {
          publicId,
          mediaType,
        },
        timingMs: Date.now() - started,
      });

      const matches = report.identity.matches;
      const identityMapping = resolveIdentityMapping({
        ids: {
          tmdb: matches.tmdb,
          imdb: typeof matches.imdb === 'string' ? matches.imdb : undefined,
        },
        entityKind: mediaType === 'movie' ? 'movie' : 'series',
      });

      return {
        report,
        identity: {
          mapping: identityMapping,
          diagnostics: buildIdentityDiagnostics(identityMapping, precedenceScore),
        },
        correlationId: request.correlationId,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code: 'upstream',
              providerId: 'tmdb',
              message: 'Inspect failed',
              cause: error,
            });

      const status =
        providerError.code === 'auth'
          ? 400
          : providerError.code === 'not_found' || providerError.code === 'validation'
            ? 404
            : 502;

      return reply.status(status).send(
        createApiError({
          code:
            providerError.code === 'auth'
              ? 'SOURCE_CREDENTIAL_MISSING'
              : 'PROVIDER_UNAVAILABLE',
          message: providerError.message,
          correlationId: request.correlationId,
          params: { provider: providerError.providerId },
        }),
      );
    }
  });
};

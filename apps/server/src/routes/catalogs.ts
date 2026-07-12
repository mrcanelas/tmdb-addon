import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  createMergedCatalog,
  createRotatedCatalog,
  deleteCatalog,
  duplicateCatalog,
  exportCatalogDefinitions,
  importCatalogDefinitions,
  moveCatalog,
  renameCatalog,
  resolveCatalogResults,
  setCatalogEnabled,
  setCatalogGroup,
  setCatalogShowInHome,
  setCatalogTags,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
  type CatalogMetaPreview,
} from '@metalayer/catalogs';
import { createApiError } from '@metalayer/api-errors';
import type { CatalogDefinition } from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  ProviderError,
  TmdbProviderAdapter,
  AnilistProviderAdapter,
  MalJikanProviderAdapter,
  KitsuProviderAdapter,
  createProviderAdapter,
} from '@metalayer/providers';

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
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const credential = readEditCredential(request);
  if (!credential || !await app.configStore.verifyEditAccess(configId, credential)) {
    const exists = await app.configStore.getPublic(configId);
    if (!exists) {
      return {
        ok: false,
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
      ok: false,
      status: 401,
      body: createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Edit credential is invalid',
        correlationId: request.correlationId,
      }),
    };
  }
  return { ok: true };
}

function studioPayload(
  configId: string,
  catalogs: CatalogDefinition[],
  correlationId: string,
  locale?: string,
) {
  const ordered = sortCatalogsByPosition(catalogs);
  return {
    configId,
    catalogs: ordered,
    manifestOrder: toManifestCatalogEntries(ordered, locale),
    correlationId,
  };
}

export const catalogsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string }; Querystring: { locale?: string } }>(
    '/configurations/:configId/catalogs',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = (await app.configStore.getPublic(request.params.configId))!;
      return studioPayload(
        view.configId,
        view.config.catalogs,
        request.correlationId,
        request.query.locale || view.config.localization.metadataLocale,
      );
    },
  );

  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/catalogs/export',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = (await app.configStore.getPublic(request.params.configId))!;
      return {
        configId: view.configId,
        catalogs: exportCatalogDefinitions(view.config.catalogs),
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string };
    Body: {
      mode?: 'replace' | 'append';
      catalogs?: unknown;
      note?: string;
      action?: 'createMerged' | 'createRotated';
      name?: string;
      mediaType?: CatalogDefinition['mediaType'];
      mergeMode?: NonNullable<CatalogDefinition['merge']>['mode'];
      rotationMode?: NonNullable<CatalogDefinition['rotation']>['mode'];
      sourceInstanceIds?: string[];
    };
  }>('/configurations/:configId/catalogs', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const body = request.body ?? {};
    let catalogs = view.config.catalogs;

    try {
      if (body.catalogs !== undefined) {
        catalogs = importCatalogDefinitions(catalogs, body.catalogs, body.mode ?? 'append');
      } else if (body.action === 'createMerged') {
        if (!body.name || !body.mediaType || !body.mergeMode || !body.sourceInstanceIds) {
          return reply.status(400).send(
            createApiError({
              code: 'VALIDATION_FAILED',
              message: 'name, mediaType, mergeMode, and sourceInstanceIds are required',
              correlationId: request.correlationId,
            }),
          );
        }
        catalogs = createMergedCatalog(catalogs, {
          name: body.name,
          mediaType: body.mediaType,
          mode: body.mergeMode,
          sourceInstanceIds: body.sourceInstanceIds,
        });
      } else if (body.action === 'createRotated') {
        if (!body.name || !body.mediaType || !body.rotationMode || !body.sourceInstanceIds) {
          return reply.status(400).send(
            createApiError({
              code: 'VALIDATION_FAILED',
              message: 'name, mediaType, rotationMode, and sourceInstanceIds are required',
              correlationId: request.correlationId,
            }),
          );
        }
        catalogs = createRotatedCatalog(catalogs, {
          name: body.name,
          mediaType: body.mediaType,
          mode: body.rotationMode,
          sourceInstanceIds: body.sourceInstanceIds,
        });
      } else {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Provide catalogs payload or createMerged/createRotated action',
            correlationId: request.correlationId,
          }),
        );
      }
    } catch (error) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Invalid catalog payload',
          correlationId: request.correlationId,
        }),
      );
    }

    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        catalogs,
        updatedAt: new Date().toISOString(),
      },
      note: body.note ?? 'catalog:bulk',
    });

    return studioPayload(updated!.configId, updated!.config.catalogs, request.correlationId);
  });

  app.post<{
    Params: { configId: string; instanceId: string };
    Body: {
      action:
        | 'rename'
        | 'duplicate'
        | 'move'
        | 'enable'
        | 'disable'
        | 'showInHome'
        | 'hideInHome'
        | 'delete'
        | 'setTags'
        | 'setGroup';
      customName?: string;
      toIndex?: number;
      tags?: string[];
      group?: string | null;
      note?: string;
    };
  }>('/configurations/:configId/catalogs/:instanceId', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const body = request.body ?? { action: 'rename' as const };
    const { instanceId } = request.params;
    let catalogs = view.config.catalogs;
    const exists = catalogs.some((catalog) => catalog.instanceId === instanceId);
    if (!exists) {
      return reply.status(404).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: `Catalog instance ${instanceId} was not found`,
          correlationId: request.correlationId,
          params: { field: 'instanceId' },
        }),
      );
    }

    switch (body.action) {
      case 'rename':
        if (!body.customName?.trim()) {
          return reply.status(400).send(
            createApiError({
              code: 'VALIDATION_FAILED',
              message: 'customName is required for rename',
              correlationId: request.correlationId,
              params: { field: 'customName' },
            }),
          );
        }
        catalogs = renameCatalog(catalogs, instanceId, body.customName.trim());
        break;
      case 'duplicate':
        catalogs = duplicateCatalog(catalogs, instanceId);
        break;
      case 'move':
        if (typeof body.toIndex !== 'number') {
          return reply.status(400).send(
            createApiError({
              code: 'VALIDATION_FAILED',
              message: 'toIndex is required for move',
              correlationId: request.correlationId,
              params: { field: 'toIndex' },
            }),
          );
        }
        catalogs = moveCatalog(catalogs, instanceId, body.toIndex);
        break;
      case 'enable':
        catalogs = setCatalogEnabled(catalogs, instanceId, true);
        break;
      case 'disable':
        catalogs = setCatalogEnabled(catalogs, instanceId, false);
        break;
      case 'showInHome':
        catalogs = setCatalogShowInHome(catalogs, instanceId, true);
        break;
      case 'hideInHome':
        catalogs = setCatalogShowInHome(catalogs, instanceId, false);
        break;
      case 'delete':
        catalogs = deleteCatalog(catalogs, instanceId);
        break;
      case 'setTags':
        catalogs = setCatalogTags(catalogs, instanceId, body.tags ?? []);
        break;
      case 'setGroup':
        catalogs = setCatalogGroup(
          catalogs,
          instanceId,
          body.group === null ? undefined : body.group,
        );
        break;
      default:
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Unsupported catalog action',
            correlationId: request.correlationId,
            params: { field: 'action' },
          }),
        );
    }

    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        catalogs,
        updatedAt: new Date().toISOString(),
      },
      note: body.note ?? `catalog:${body.action}`,
    });

    return studioPayload(updated!.configId, updated!.config.catalogs, request.correlationId);
  });

  app.post<{
    Params: { configId: string; instanceId: string };
    Body: { page?: number; apiKey?: string };
    Querystring: { locale?: string; region?: string };
  }>('/configurations/:configId/catalogs/:instanceId/preview', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const locale =
      request.query.locale || view.config.localization.metadataLocale || 'en-US';
    const region =
      request.query.region ||
      view.config.localization.availabilityRegion ||
      view.config.localization.contentRegion;
    const apiKey =
      request.body?.apiKey ||
      await app.configStore.getSecretPlaintext(request.params.configId, 'tmdb') ||
      process.env.METALAYER_TMDB_API_KEY ||
      process.env.TMDB_API;

    const started = Date.now();
    try {
      const resolved = await resolveCatalogResults(
        view.config.catalogs,
        request.params.instanceId,
        async (catalog) => {
          const ctx = {
            correlationId: request.correlationId,
            locale,
            region,
            apiKey,
          };

          if (catalog.provider === 'tmdb') {
            const adapter = createProviderAdapter('tmdb', {
              apiKey,
              fetchImpl: app.providerFetch,
              cache: app.providerCache,
              stremioPublicId: view.config.identity?.stremioPublicId || 'imdb',
            });
            if (!(adapter instanceof TmdbProviderAdapter)) {
              throw new Error('TMDB adapter unavailable');
            }
            const items = await adapter.getCatalogPage(ctx, {
              providerCatalogId: catalog.providerCatalogId,
              mediaType: catalog.mediaType,
              page: request.body?.page ?? 1,
            });
            return items.map(
              (item): CatalogMetaPreview => ({
                id: item.publicId,
                type: item.mediaType,
                name: item.name,
                poster: item.posterPath
                  ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
                  : undefined,
                releaseInfo: item.releaseDate,
                provider: 'tmdb',
              }),
            );
          }

          if (
            catalog.provider === 'anilist' ||
            catalog.provider === 'mal' ||
            catalog.provider === 'kitsu'
          ) {
            const adapter = createProviderAdapter(catalog.provider, {
              fetchImpl: app.providerFetch,
              cache: app.providerCache,
              jikanBaseUrl: process.env.METALAYER_JIKAN_URL,
            });
            if (
              !(adapter instanceof AnilistProviderAdapter) &&
              !(adapter instanceof MalJikanProviderAdapter) &&
              !(adapter instanceof KitsuProviderAdapter)
            ) {
              throw new Error(`${catalog.provider} anime adapter unavailable`);
            }
            const items = await adapter.getCatalogPage(ctx, {
              providerCatalogId: catalog.providerCatalogId,
              mediaType: 'anime',
              page: request.body?.page ?? 1,
            });
            return items.map(
              (item): CatalogMetaPreview => ({
                id: item.publicId,
                type: 'anime',
                name: item.name,
                poster: item.posterUrl ?? undefined,
                provider: catalog.provider,
              }),
            );
          }

          throw new Error(`Provider ${catalog.provider} catalog preview is not available yet`);
        },
      );

      return {
        configId: view.configId,
        instanceId: request.params.instanceId,
        metas: resolved.metas,
        warnings: resolved.warnings,
        mode: resolved.mode,
        activeSourceId: resolved.activeSourceId,
        timingMs: Date.now() - started,
        correlationId: request.correlationId,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code: 'upstream',
              providerId: 'tmdb',
              message: 'Catalog preview failed',
              cause: error,
            });
      const status = providerError.code === 'auth' ? 400 : 502;
      return reply.status(status).send({
        metas: [],
        warnings: [providerError.message],
        error: {
          code:
            providerError.code === 'auth'
              ? 'SOURCE_CREDENTIAL_MISSING'
              : 'PROVIDER_UNAVAILABLE',
          providerCode: providerError.code,
          message: providerError.message,
        },
        correlationId: request.correlationId,
      });
    }
  });
};

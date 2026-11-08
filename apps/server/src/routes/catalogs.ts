import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createMergedCatalog,
  createRotatedCatalog,
  deleteCatalog,
  duplicateCatalog,
  exportCatalogDefinitions,
  importCatalogDefinitions,
  moveCatalog,
  renameCatalog,
  setCatalogEnabled,
  setCatalogGroup,
  setCatalogShowInHome,
  setCatalogTags,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
} from '@metalayer/catalogs';
import { createApiError } from '@metalayer/api-errors';
import type { CatalogDefinition } from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { CacheStore } from '@metalayer/cache';
import type { ProviderHealthRegistry, TmdbFetch } from '@metalayer/providers';
import { CATALOG_PAGE_SIZE, loadCatalogWindow } from '../stremio/catalog-window.js';

const CatalogLocalizedNameSchema = z.object({
  default: z.string().min(1),
  values: z.record(z.string()).optional(),
});

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
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
      name?: { default: string; values?: Record<string, string> };
      toIndex?: number;
      tags?: string[];
      group?: string | null;
      copySuffix?: string;
      locale?: string;
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
      case 'rename': {
        if (body.name !== undefined) {
          const parsed = CatalogLocalizedNameSchema.safeParse(body.name);
          if (!parsed.success) {
            return reply.status(400).send(
              createApiError({
                code: 'VALIDATION_FAILED',
                message: 'name must include a non-empty default string',
                correlationId: request.correlationId,
                params: { field: 'name' },
              }),
            );
          }
          const defaultName = parsed.data.default.trim();
          if (!defaultName) {
            return reply.status(400).send(
              createApiError({
                code: 'VALIDATION_FAILED',
                message: 'name.default is required for rename',
                correlationId: request.correlationId,
                params: { field: 'name' },
              }),
            );
          }
          const values = parsed.data.values
            ? Object.fromEntries(
                Object.entries(parsed.data.values)
                  .map(([locale, value]) => [locale, value.trim()] as const)
                  .filter(([, value]) => value.length > 0),
              )
            : undefined;
          catalogs = renameCatalog(catalogs, instanceId, {
            default: defaultName,
            values:
              values && Object.keys(values).length > 0 ? values : undefined,
          });
          break;
        }
        if (!body.customName?.trim()) {
          return reply.status(400).send(
            createApiError({
              code: 'VALIDATION_FAILED',
              message: 'name or customName is required for rename',
              correlationId: request.correlationId,
              params: { field: 'name' },
            }),
          );
        }
        catalogs = renameCatalog(catalogs, instanceId, body.customName.trim());
        break;
      }
      case 'duplicate':
        catalogs = duplicateCatalog(catalogs, instanceId, {
          copySuffix: body.copySuffix,
          locale: body.locale,
        });
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
    const catalog = view.config.catalogs.find(
      (item) => item.instanceId === request.params.instanceId,
    );
    if (!catalog) {
      return reply.status(404).send(
        createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Catalog ${request.params.instanceId} was not found`,
          correlationId: request.correlationId,
          params: { instanceId: request.params.instanceId },
        }),
      );
    }

    const started = Date.now();
    try {
      // Studio preview serves exactly what Stremio receives for the same offset.
      const page = Math.max(1, request.body?.page ?? 1);
      const resolved = await loadCatalogWindow(
        app,
        { ...view.config, localization: { ...view.config.localization,
          metadataLocale: request.query.locale || view.config.localization.metadataLocale,
          availabilityRegion: request.query.region || view.config.localization.availabilityRegion } },
        catalog,
        (page - 1) * CATALOG_PAGE_SIZE,
        request.correlationId,
        async (provider, kind) => {
          if (provider === 'tmdb' && request.body?.apiKey) {
            return request.body.apiKey;
          }
          return app.configStore.getSecretPlaintext(
            request.params.configId,
            provider,
            kind ?? 'api_key',
          );
        },
        // Ad-hoc keys / locale overrides must not seed the public window.
        {
          configId: view.configId,
          bypassCache: Boolean(request.body?.apiKey || request.query.locale || request.query.region),
        },
      );

      return {
        configId: view.configId,
        instanceId: request.params.instanceId,
        metas: resolved.metas,
        warnings: resolved.warnings,
        mode: catalog.merge ? 'merge' : catalog.rotation ? 'rotation' : 'leaf',
        window: resolved.window,
        timingMs: Date.now() - started,
        correlationId: request.correlationId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Catalog preview failed';
      const isAuth =
        /api key|credential|auth/i.test(message) ||
        (typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'auth');
      const status = isAuth ? 400 : 502;
      return reply.status(status).send({
        metas: [],
        warnings: [
          {
            code: isAuth ? 'SOURCE_CREDENTIAL_MISSING' : 'PROVIDER_UNAVAILABLE',
          },
        ],
        error: {
          code: isAuth ? 'SOURCE_CREDENTIAL_MISSING' : 'PROVIDER_UNAVAILABLE',
          message,
        },
        correlationId: request.correlationId,
      });
    }
  });
};

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  duplicateCatalog,
  moveCatalog,
  renameCatalog,
  setCatalogEnabled,
  setCatalogShowInHome,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
} from '@metalayer/catalogs';
import { createApiError } from '@metalayer/api-errors';
import type { ConfigurationStore } from '@metalayer/persistence';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

export const catalogsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string }; Querystring: { locale?: string } }>(
    '/configurations/:configId/catalogs',
    async (request, reply) => {
      const credential = readEditCredential(request);
      if (!credential || !app.configStore.verifyEditAccess(request.params.configId, credential)) {
        return reply.status(401).send(
          createApiError({
            code: 'EDIT_CREDENTIAL_INVALID',
            message: 'Edit credential is invalid',
            correlationId: request.correlationId,
          }),
        );
      }

      const view = app.configStore.getPublic(request.params.configId);
      if (!view) {
        return reply.status(404).send(
          createApiError({
            code: 'CONFIGURATION_NOT_FOUND',
            message: `Configuration ${request.params.configId} was not found`,
            correlationId: request.correlationId,
            params: { configId: request.params.configId },
          }),
        );
      }

      const catalogs = sortCatalogsByPosition(view.config.catalogs);
      return {
        configId: view.configId,
        catalogs,
        manifestOrder: toManifestCatalogEntries(
          catalogs,
          request.query.locale || view.config.localization.metadataLocale,
        ),
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string; instanceId: string };
    Body: {
      action: 'rename' | 'duplicate' | 'move' | 'enable' | 'disable' | 'showInHome' | 'hideInHome';
      customName?: string;
      toIndex?: number;
      note?: string;
    };
  }>('/configurations/:configId/catalogs/:instanceId', async (request, reply) => {
    const credential = readEditCredential(request);
    if (!credential || !app.configStore.verifyEditAccess(request.params.configId, credential)) {
      return reply.status(401).send(
        createApiError({
          code: 'EDIT_CREDENTIAL_INVALID',
          message: 'Edit credential is invalid',
          correlationId: request.correlationId,
        }),
      );
    }

    const view = app.configStore.getPublic(request.params.configId);
    if (!view) {
      return reply.status(404).send(
        createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Configuration ${request.params.configId} was not found`,
          correlationId: request.correlationId,
          params: { configId: request.params.configId },
        }),
      );
    }

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

    const updated = app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        catalogs,
        updatedAt: new Date().toISOString(),
      },
      note: body.note ?? `catalog:${body.action}`,
    });

    return {
      configId: updated!.configId,
      catalogs: sortCatalogsByPosition(updated!.config.catalogs),
      manifestOrder: toManifestCatalogEntries(updated!.config.catalogs),
      correlationId: request.correlationId,
    };
  });
};

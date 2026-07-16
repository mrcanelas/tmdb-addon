import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import {
  createPublicMetaDBListCatalogDrafts,
  createPublicMetaDBPickCatalogDrafts,
  createPublicMetaDBUpNextCatalogDraft,
  detectPublicMetaDBListMediaTypes,
  filterNewPublicMetaDBCatalogs,
  importCatalogDefinitions,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
} from '@metalayer/catalogs';
import { createApiError } from '@metalayer/api-errors';
import type { CatalogDefinition } from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  PublicMetaDBAdapter,
  ProviderError,
  fetchPublicMetaDBListItems,
} from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

type ConnectBody = { apiKey?: string };
type ImportSelection =
  | { kind: 'upnext' }
  | { kind: 'list'; listId: string; name: string }
  | {
      kind: 'pick';
      pickId: string;
      name: string;
      mediaTypes?: string[];
    };

type ImportBody = {
  apiKey?: string;
  selections: ImportSelection[];
};

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

async function resolvePublicMetaDBApiKey(options: {
  app: { configStore: ConfigurationStore };
  request: FastifyRequest;
  reply: FastifyReply;
  configId: string;
  apiKey?: string;
}): Promise<string | 'failed'> {
  if (options.apiKey) return options.apiKey;

  const fromVault = await options.app.configStore.getSecretPlaintext(
    options.configId,
    'publicmetadb',
  );
  if (!fromVault) {
    await options.reply.status(400).send(
      createApiError({
        code: 'SOURCE_CREDENTIAL_MISSING',
        message: 'PublicMetaDB API key is not configured',
        correlationId: options.request.correlationId,
        params: { source: 'publicmetadb' },
      }),
    );
    return 'failed';
  }
  return fromVault;
}

function getPublicMetaDBAdapter(
  app: Parameters<typeof createAppProviderAdapter>[0],
  apiKey: string,
): PublicMetaDBAdapter | null {
  const adapter = createAppProviderAdapter(app, 'publicmetadb', { apiKey });
  return adapter instanceof PublicMetaDBAdapter ? adapter : null;
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

export const publicMetaDBSourcesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/sources/publicmetadb/status',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const apiKey = await app.configStore.getSecretPlaintext(
        request.params.configId,
        'publicmetadb',
      );
      return {
        connected: Boolean(apiKey),
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string }; Querystring: { apiKey?: string } }>(
    '/configurations/:configId/sources/publicmetadb/lists',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const apiKey = await resolvePublicMetaDBApiKey({
        app,
        request,
        reply,
        configId: request.params.configId,
        apiKey: request.query.apiKey,
      });
      if (apiKey === 'failed') return;

      const adapter = getPublicMetaDBAdapter(app, apiKey);
      if (!adapter) {
        return reply.status(501).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'PublicMetaDB adapter is unavailable',
            correlationId: request.correlationId,
            params: { provider: 'publicmetadb' },
          }),
        );
      }

      const data = await adapter.listLists(
        { correlationId: request.correlationId, apiKey },
        1,
        500,
      );
      return {
        items: data.items ?? [],
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{ Params: { configId: string }; Querystring: { apiKey?: string } }>(
    '/configurations/:configId/sources/publicmetadb/picks',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const apiKey = await resolvePublicMetaDBApiKey({
        app,
        request,
        reply,
        configId: request.params.configId,
        apiKey: request.query.apiKey,
      });
      if (apiKey === 'failed') return;

      const adapter = getPublicMetaDBAdapter(app, apiKey);
      if (!adapter) {
        return reply.status(501).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'PublicMetaDB adapter is unavailable',
            correlationId: request.correlationId,
            params: { provider: 'publicmetadb' },
          }),
        );
      }

      const data = await adapter.listPicks({
        correlationId: request.correlationId,
        apiKey,
      });
      return {
        items: data.items ?? [],
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{ Params: { configId: string }; Body: ConnectBody }>(
    '/configurations/:configId/sources/publicmetadb/connect',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const apiKey = request.body?.apiKey?.trim();
      if (!apiKey) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'apiKey is required',
            correlationId: request.correlationId,
            params: { field: 'apiKey' },
          }),
        );
      }

      const adapter = getPublicMetaDBAdapter(app, apiKey);
      if (!adapter) {
        return reply.status(501).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'PublicMetaDB adapter is unavailable',
            correlationId: request.correlationId,
            params: { provider: 'publicmetadb' },
          }),
        );
      }

      try {
        await adapter.ping({
          correlationId: request.correlationId,
          apiKey,
        });
      } catch (error) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError({
                code: 'upstream',
                providerId: 'publicmetadb',
                message: 'PublicMetaDB connection failed',
                cause: error,
              });
        return reply.status(providerError.code === 'auth' ? 400 : 502).send(
          createApiError({
            code:
              providerError.code === 'auth'
                ? 'SOURCE_CREDENTIAL_INVALID'
                : 'PROVIDER_UNAVAILABLE',
            message: providerError.message,
            correlationId: request.correlationId,
            params: { source: 'publicmetadb' },
          }),
        );
      }

      const view = (await app.configStore.getPublic(request.params.configId))!;
      await app.configStore.update(request.params.configId, {
        config: view.config,
        secrets: { publicmetadb: apiKey },
        note: 'publicmetadb:connect',
      });

      return {
        connected: true,
        correlationId: request.correlationId,
      };
    },
  );

  app.delete<{ Params: { configId: string } }>(
    '/configurations/:configId/sources/publicmetadb/disconnect',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const view = (await app.configStore.getPublic(request.params.configId))!;
      const catalogs = view.config.catalogs.filter(
        (catalog) => catalog.provider !== 'publicmetadb',
      );

      await app.configStore.update(request.params.configId, {
        config: {
          ...view.config,
          catalogs,
          updatedAt: new Date().toISOString(),
        },
        note: 'publicmetadb:disconnect',
      });
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'publicmetadb',
        'api_key',
      );

      return {
        connected: false,
        removedCatalogs: view.config.catalogs.length - catalogs.length,
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{ Params: { configId: string }; Body: ImportBody }>(
    '/configurations/:configId/sources/publicmetadb/import',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const selections = request.body?.selections ?? [];
      if (selections.length === 0) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'At least one catalog selection is required',
            correlationId: request.correlationId,
            params: { field: 'selections' },
          }),
        );
      }

      const apiKey = await resolvePublicMetaDBApiKey({
        app,
        request,
        reply,
        configId: request.params.configId,
        apiKey: request.body?.apiKey,
      });
      if (apiKey === 'failed') return;

      const view = (await app.configStore.getPublic(request.params.configId))!;
      const drafts = [];

      for (const selection of selections) {
        if (selection.kind === 'upnext') {
          drafts.push(createPublicMetaDBUpNextCatalogDraft());
          continue;
        }

        if (selection.kind === 'list') {
          const sample = await fetchPublicMetaDBListItems({
            apiKey,
            listId: selection.listId,
            page: 1,
            perPage: 100,
          });
          const mediaTypes = detectPublicMetaDBListMediaTypes(sample.items ?? []);
          drafts.push(
            ...createPublicMetaDBListCatalogDrafts(
              { id: selection.listId, name: selection.name },
              mediaTypes,
            ),
          );
          continue;
        }

        if (selection.kind === 'pick') {
          drafts.push(
            ...createPublicMetaDBPickCatalogDrafts({
              id: selection.pickId,
              name: selection.name,
              filters: selection.mediaTypes
                ? { media_types: selection.mediaTypes }
                : undefined,
            }),
          );
        }
      }

      const novel = filterNewPublicMetaDBCatalogs(view.config.catalogs, drafts);
      if (novel.length === 0) {
        return {
          imported: 0,
          skipped: drafts.length,
          ...studioPayload(
            view.configId,
            view.config.catalogs,
            request.correlationId,
            view.config.localization.interfaceLocale,
          ),
        };
      }

      const toImport = novel.map((draft, index) => ({
        ...draft,
        instanceId: `import_${index}`,
        position: view.config.catalogs.length + index,
        enabled: true,
        showInHome: true,
        tags: [] as string[],
      }));
      const catalogs = importCatalogDefinitions(
        view.config.catalogs,
        toImport,
        'append',
      );

      const updated = await app.configStore.update(request.params.configId, {
        config: {
          ...view.config,
          catalogs,
          updatedAt: new Date().toISOString(),
        },
        note: 'publicmetadb:import',
        secrets: request.body?.apiKey ? { publicmetadb: request.body.apiKey } : undefined,
      });

      return {
        imported: novel.length,
        skipped: drafts.length - novel.length,
        ...studioPayload(
          updated!.configId,
          updated!.config.catalogs,
          request.correlationId,
          updated!.config.localization.interfaceLocale,
        ),
      };
    },
  );
};

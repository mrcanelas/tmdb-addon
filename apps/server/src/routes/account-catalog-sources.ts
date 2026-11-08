import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createApiError } from '@metalayer/api-errors';
import {
  importCatalogDefinitions,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
} from '@metalayer/catalogs';
import type { CatalogDefinition } from '@metalayer/config';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  ANILIST_ACCOUNT_CATALOGS,
  MAL_ACCOUNT_CATALOGS,
  MdblistAdapter,
  SIMKL_ACCOUNT_CATALOGS,
  TRAKT_ACCOUNT_CATALOGS,
  TmdbProviderAdapter,
  TraktTrackingAdapter,
  type AccountCatalogDescriptor,
} from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';
import type { InstanceProviderSettings } from '../instance-provider-settings.js';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
    instanceProviders: InstanceProviderSettings;
  }
}

/** Providers that expose account/list catalogs (AGENTS.md §8.2, §20). */
export const ACCOUNT_CATALOG_PROVIDERS = [
  'trakt',
  'mdblist',
  'tmdb',
  'simkl',
  'anilist',
  'mal',
] as const;
export type AccountCatalogProviderId = (typeof ACCOUNT_CATALOG_PROVIDERS)[number];

export interface AccountCatalogSourceView {
  provider: AccountCatalogProviderId;
  /** Instance-level enablement (§8.1.1). */
  available: boolean;
  /** User credential present for this configuration. */
  connected: boolean;
  /** Stable reason code when catalogs cannot be listed. */
  reason?: 'PROVIDER_DISABLED' | 'SOURCE_CREDENTIAL_MISSING' | 'PROVIDER_UNAVAILABLE';
  catalogs: AccountCatalogDescriptor[];
}

const ImportSelectionSchema = z.object({
  provider: z.enum(ACCOUNT_CATALOG_PROVIDERS),
  providerCatalogId: z.string().min(1).max(200),
  mediaType: z.enum(['movie', 'series', 'anime']),
  name: z.string().min(1).max(120),
});

const ImportBodySchema = z.object({
  selections: z.array(ImportSelectionSchema).min(1).max(50),
});

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
  if (!credential || !(await app.configStore.verifyEditAccess(configId, credential))) {
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

async function userCredential(
  store: ConfigurationStore,
  configId: string,
  provider: AccountCatalogProviderId,
): Promise<string | null> {
  switch (provider) {
    case 'mdblist':
      return store.getSecretPlaintext(configId, 'mdblist', 'api_key');
    case 'tmdb':
      return store.getSecretPlaintext(configId, 'tmdb_session', 'api_key');
    default:
      return (
        (await store.getSecretPlaintext(configId, provider, 'oauth_access')) ||
        (await store.getSecretPlaintext(configId, provider, 'api_key'))
      );
  }
}

/**
 * Lists the catalogs each account provider can expose for one configuration.
 * Public (unauthenticated) Trakt catalogs are offered without a token when the
 * instance has a Trakt client id; everything else requires a connected account.
 */
export async function describeAccountCatalogSources(
  app: {
    configStore: ConfigurationStore;
    instanceProviders: InstanceProviderSettings;
    providerFetch?: Parameters<typeof createAppProviderAdapter>[0]['providerFetch'];
    providerHealth: Parameters<typeof createAppProviderAdapter>[0]['providerHealth'];
  },
  configId: string,
  correlationId: string,
): Promise<AccountCatalogSourceView[]> {
  const views: AccountCatalogSourceView[] = [];
  const ctx = { correlationId };

  for (const provider of ACCOUNT_CATALOG_PROVIDERS) {
    const instance = app.instanceProviders.get(provider);
    if (!instance.enabled) {
      views.push({ provider, available: false, connected: false, reason: 'PROVIDER_DISABLED', catalogs: [] });
      continue;
    }
    const credential = await userCredential(app.configStore, configId, provider);
    const connected = Boolean(credential);

    if (provider === 'trakt') {
      const catalogs = TRAKT_ACCOUNT_CATALOGS.filter(
        (catalog) => connected || !catalog.requiresCredential,
      ).slice();
      if (connected && instance.configured) {
        try {
          const adapter = createAppProviderAdapter(app, 'trakt', { accessToken: credential! });
          if (adapter instanceof TraktTrackingAdapter) {
            const lists = await adapter.getUserLists(ctx);
            catalogs.push(
              ...lists.map((list) => ({
                provider: 'trakt',
                providerCatalogId: `list.${list.slug}`,
                mediaTypes: ['movie', 'series'] as Array<'movie' | 'series'>,
                name: list.name,
                requiresCredential: true,
              })),
            );
          }
        } catch {
          // Personal lists are optional; built-in catalogs remain available.
        }
      }
      views.push({
        provider,
        available: instance.configured,
        connected,
        reason: !instance.configured ? 'PROVIDER_UNAVAILABLE' : connected ? undefined : 'SOURCE_CREDENTIAL_MISSING',
        catalogs: instance.configured ? catalogs : [],
      });
      continue;
    }

    if (!connected) {
      views.push({ provider, available: true, connected: false, reason: 'SOURCE_CREDENTIAL_MISSING', catalogs: [] });
      continue;
    }

    try {
      switch (provider) {
        case 'mdblist': {
          const adapter = createAppProviderAdapter(app, 'mdblist', { apiKey: credential! });
          const lists =
            adapter instanceof MdblistAdapter
              ? adapter.describeCatalogs(await adapter.getUserLists({ ...ctx, apiKey: credential! }))
              : [];
          views.push({ provider, available: true, connected, catalogs: lists });
          break;
        }
        case 'tmdb': {
          const apiKey =
            (await app.configStore.getSecretPlaintext(configId, 'tmdb', 'api_key')) ||
            (await app.configStore.getInstanceSecretPlaintext('tmdb')) ||
            process.env.METALAYER_TMDB_API_KEY ||
            process.env.TMDB_API;
          const base: AccountCatalogDescriptor[] = [
            { provider: 'tmdb', providerCatalogId: 'account.watchlist', mediaTypes: ['movie', 'series'], name: 'TMDB Watchlist', requiresCredential: true },
            { provider: 'tmdb', providerCatalogId: 'account.favorites', mediaTypes: ['movie', 'series'], name: 'TMDB Favorites', requiresCredential: true },
          ];
          if (apiKey) {
            const adapter = createAppProviderAdapter(app, 'tmdb', { apiKey });
            if (adapter instanceof TmdbProviderAdapter) {
              const lists = await adapter.getAccountLists({ ...ctx, apiKey }, credential!);
              base.push(
                ...lists.map((list) => ({
                  provider: 'tmdb',
                  providerCatalogId: `account.list.${list.id}`,
                  mediaTypes: ['movie', 'series'] as Array<'movie' | 'series'>,
                  name: list.name,
                  requiresCredential: true,
                })),
              );
            }
          }
          views.push({ provider, available: true, connected, catalogs: base });
          break;
        }
        case 'simkl':
          views.push({ provider, available: true, connected, catalogs: SIMKL_ACCOUNT_CATALOGS });
          break;
        case 'anilist':
          views.push({ provider, available: true, connected, catalogs: ANILIST_ACCOUNT_CATALOGS });
          break;
        case 'mal':
          views.push({ provider, available: true, connected, catalogs: MAL_ACCOUNT_CATALOGS });
          break;
      }
    } catch {
      views.push({ provider, available: true, connected, reason: 'PROVIDER_UNAVAILABLE', catalogs: [] });
    }
  }

  return views;
}

export const accountCatalogSourcesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/catalog-sources',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);
      const sources = await describeAccountCatalogSources(
        app,
        request.params.configId,
        request.correlationId,
      );
      return { sources, correlationId: request.correlationId };
    },
  );

  app.post<{ Params: { configId: string }; Body: unknown }>(
    '/configurations/:configId/catalog-sources/import',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const parsed = ImportBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'selections must contain 1–50 account catalogs',
            correlationId: request.correlationId,
            params: { field: 'selections' },
            details: parsed.error.flatten(),
          }),
        );
      }

      // §8.1.1 — refuse catalogs whose provider is disabled at instance level.
      const disabled = parsed.data.selections.find(
        (selection) => !app.instanceProviders.get(selection.provider).enabled,
      );
      if (disabled) {
        return reply.status(400).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${disabled.provider} is disabled on this instance`,
            correlationId: request.correlationId,
            params: { provider: disabled.provider },
          }),
        );
      }

      const view = (await app.configStore.getPublic(request.params.configId))!;
      const existing = view.config.catalogs;
      const novel = parsed.data.selections.filter(
        (selection) =>
          !existing.some(
            (catalog) =>
              catalog.provider === selection.provider &&
              catalog.providerCatalogId === selection.providerCatalogId &&
              catalog.mediaType === selection.mediaType,
          ),
      );
      if (novel.length === 0) {
        return {
          imported: 0,
          skipped: parsed.data.selections.length,
          configId: view.configId,
          catalogs: sortCatalogsByPosition(existing),
          manifestOrder: toManifestCatalogEntries(
            sortCatalogsByPosition(existing),
            view.config.localization.interfaceLocale,
          ),
          correlationId: request.correlationId,
        };
      }

      const drafts: CatalogDefinition[] = novel.map((selection, index) => ({
        instanceId: `account_import_${index}`,
        provider: selection.provider,
        providerCatalogId: selection.providerCatalogId,
        mediaType: selection.mediaType,
        originalName: selection.name,
        name: { default: selection.name },
        enabled: true,
        showInHome: true,
        position: existing.length + index,
        tags: ['account'],
      }));
      const catalogs = importCatalogDefinitions(existing, drafts, 'append');
      const updated = await app.configStore.update(request.params.configId, {
        config: { ...view.config, catalogs, updatedAt: new Date().toISOString() },
        note: 'account-catalogs:import',
      });
      const ordered = sortCatalogsByPosition(updated!.config.catalogs);
      return {
        imported: novel.length,
        skipped: parsed.data.selections.length - novel.length,
        configId: updated!.configId,
        catalogs: ordered,
        manifestOrder: toManifestCatalogEntries(
          ordered,
          updated!.config.localization.interfaceLocale,
        ),
        correlationId: request.correlationId,
      };
    },
  );
};

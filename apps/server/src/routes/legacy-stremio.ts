import type { FastifyPluginAsync } from 'fastify';
import { createRequire } from 'node:module';
import {
  planLegacyImport,
  type MetaLayerConfig,
} from '@metalayer/config';
import type { CorrectionRegistry } from '@metalayer/corrections';
import type { ProviderHealthRegistry, TmdbFetch } from '@metalayer/providers';
import { ProviderError } from '@metalayer/providers';
import type { CacheStore } from '@metalayer/cache';
import { buildStremioManifest } from '../stremio/build-manifest.js';
import {
  findCatalogByManifestId,
  loadCatalogMetas,
  parseSkip,
  resolveStremioMeta,
  stremioType,
  type SecretResolver,
} from '../stremio/catalog-meta.js';

const require = createRequire(import.meta.url);
const { LEGACY } = require('@metalayer/identity') as {
  LEGACY: {
    manifestId: string;
    manifestName: string;
    manifestVersion: string;
  };
};

declare module 'fastify' {
  interface FastifyInstance {
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
    correctionRegistry: CorrectionRegistry;
  }
}

/** Legacy Stremio page size (~20). */
const LEGACY_PAGE_SIZE = 20;

/**
 * Path segments reserved for MetaLayer / SPA — never treat as catalogChoices.
 */
const RESERVED_CATALOG_CHOICES = new Set([
  'api',
  'c',
  'configure',
  'admin',
  'health',
  'public',
  'dist',
  'assets',
  'favicon.ico',
  'manifest.json',
]);

type ReplyLike = {
  status: (code: number) => { send: (body: unknown) => unknown };
};

function resolveLegacyPlan(catalogChoices: string | undefined): {
  config: MetaLayerConfig;
  secrets: Record<string, string>;
} {
  const source =
    catalogChoices === undefined || catalogChoices === ''
      ? {}
      : catalogChoices;
  try {
    const plan = planLegacyImport(source, {
      name: 'Legacy URL compatibility',
    });
    return { config: plan.config, secrets: plan.secrets };
  } catch {
    // Invalid blob → empty defaults (still LEGACY identity for install stability).
    const plan = planLegacyImport({}, { name: 'Legacy URL compatibility' });
    return { config: plan.config, secrets: {} };
  }
}

function memorySecretResolver(
  secrets: Record<string, string>,
): SecretResolver {
  return async (provider) => secrets[provider] ?? null;
}

/**
 * TMDB Addon compatibility routes: compressed config in the URL path.
 * Uses LEGACY manifest identity so existing Stremio installs keep working.
 * Secrets from the blob are request-scoped only and never persisted.
 */
export const legacyStremioRoutes: FastifyPluginAsync = async (app) => {
  async function handleManifest(
    catalogChoices: string | undefined,
  ) {
    const { config } = resolveLegacyPlan(catalogChoices);
    return buildStremioManifest(
      config,
      {
        manifestId: LEGACY.manifestId,
        manifestName: LEGACY.manifestName,
        version: LEGACY.manifestVersion,
      },
      'The Movie Database Addon (MetaLayer compatibility). Prefer importing into a native MetaLayer configuration.',
      { pageSize: LEGACY_PAGE_SIZE },
    );
  }

  async function handleCatalog(
    catalogChoices: string | undefined,
    type: string,
    id: string,
    extra: string | undefined,
    correlationId: string,
  ) {
    const { config, secrets } = resolveLegacyPlan(catalogChoices);
    const catalog = findCatalogByManifestId(config.catalogs, type, id);
    if (!catalog) {
      return { metas: [] };
    }

    const skip = parseSkip(extra);
    const page = Math.floor(skip / LEGACY_PAGE_SIZE) + 1;

    try {
      const metas = await loadCatalogMetas(
        app,
        config,
        catalog,
        page,
        correlationId,
        memorySecretResolver(secrets),
      );
      return {
        metas: metas.map((meta) => ({
          id: meta.id,
          type: stremioType(meta.type),
          name: meta.name,
          poster: meta.poster ?? undefined,
          releaseInfo: meta.releaseInfo,
        })),
      };
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'auth') {
        return { metas: [] };
      }
      return { metas: [] };
    }
  }

  async function handleMeta(
    catalogChoices: string | undefined,
    type: string,
    id: string,
    correlationId: string,
    reply: ReplyLike,
  ) {
    if (type !== 'movie' && type !== 'series' && type !== 'anime') {
      return reply.status(404).send({ meta: null });
    }

    const { config, secrets } = resolveLegacyPlan(catalogChoices);
    const result = await resolveStremioMeta(
      app,
      config,
      type,
      id,
      correlationId,
      memorySecretResolver(secrets),
    );
    return reply.status(result.status).send(result.body);
  }

  app.get('/manifest.json', async () => handleManifest(undefined));

  app.get<{ Params: { catalogChoices: string } }>(
    '/:catalogChoices/manifest.json',
    async (request, reply) => {
      if (RESERVED_CATALOG_CHOICES.has(request.params.catalogChoices)) {
        return reply.callNotFound();
      }
      return handleManifest(request.params.catalogChoices);
    },
  );

  // Fastify path constraints via regex in the path pattern
  app.get<{
    Params: { type: string; id: string };
  }>('/catalog/:type/:id.json', async (request) =>
    handleCatalog(
      undefined,
      request.params.type,
      request.params.id,
      undefined,
      request.correlationId,
    ),
  );

  app.get<{
    Params: { type: string; id: string; extra: string };
  }>('/catalog/:type/:id/:extra.json', async (request) =>
    handleCatalog(
      undefined,
      request.params.type,
      request.params.id,
      request.params.extra,
      request.correlationId,
    ),
  );

  app.get<{
    Params: { catalogChoices: string; type: string; id: string };
  }>(
    '/:catalogChoices/catalog/:type/:id.json',
    async (request, reply) => {
      if (RESERVED_CATALOG_CHOICES.has(request.params.catalogChoices)) {
        return reply.callNotFound();
      }
      return handleCatalog(
        request.params.catalogChoices,
        request.params.type,
        request.params.id,
        undefined,
        request.correlationId,
      );
    },
  );

  app.get<{
    Params: {
      catalogChoices: string;
      type: string;
      id: string;
      extra: string;
    };
  }>(
    '/:catalogChoices/catalog/:type/:id/:extra.json',
    async (request, reply) => {
      if (RESERVED_CATALOG_CHOICES.has(request.params.catalogChoices)) {
        return reply.callNotFound();
      }
      return handleCatalog(
        request.params.catalogChoices,
        request.params.type,
        request.params.id,
        request.params.extra,
        request.correlationId,
      );
    },
  );

  app.get<{
    Params: { type: string; id: string };
  }>('/meta/:type/:id.json', async (request, reply) =>
    handleMeta(
      undefined,
      request.params.type,
      request.params.id,
      request.correlationId,
      reply,
    ),
  );

  app.get<{
    Params: { catalogChoices: string; type: string; id: string };
  }>('/:catalogChoices/meta/:type/:id.json', async (request, reply) => {
    if (RESERVED_CATALOG_CHOICES.has(request.params.catalogChoices)) {
      return reply.callNotFound();
    }
    return handleMeta(
      request.params.catalogChoices,
      request.params.type,
      request.params.id,
      request.correlationId,
      reply,
    );
  });
};


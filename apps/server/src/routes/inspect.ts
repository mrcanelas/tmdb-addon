import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  FieldProvidersSchema,
  type FieldProviders,
  type MetaLayerConfig,
} from '@metalayer/config';
import {
  buildInspectorReport,
  type FieldContribution,
  type MetaInspectorReport,
  type ProviderFieldBag,
} from '@metalayer/metadata-resolver';
import {
  ProviderError,
  TmdbProviderAdapter,
  ImdbRatingsAdapter,
  FanartArtworkAdapter,
  RpdbArtworkAdapter,
  createProviderAdapter,
} from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { MemoryCache } from '@metalayer/cache';
import type { TmdbFetch } from '@metalayer/providers';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

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

type RawContribution = {
  provider: string;
  value?: unknown;
  locale?: string;
  confidence?: number;
};

function tmdbImageUrl(path: string | null | undefined, size: 'w500' | 'w1280'): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function pickAssetUrl(
  assets: Array<{ kind: string; url: string }>,
  kind: string,
): string | null {
  return assets.find((asset) => asset.kind === kind)?.url ?? null;
}

async function gatherLiveBag(
  app: {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerCache: MemoryCache;
  },
  configId: string,
  config: MetaLayerConfig,
  input: {
    id: string;
    mediaType: 'movie' | 'series' | 'anime';
    apiKey?: string;
    correlationId: string;
  },
): Promise<{ bag: ProviderFieldBag; publicId?: string }> {
  const locale = config.localization.metadataLocale;
  const fallbacks = config.localization.metadataFallbackLocales;
  const region =
    config.localization.availabilityRegion || config.localization.contentRegion;
  const apiKey =
    input.apiKey ||
    app.configStore.getSecretPlaintext(configId, 'tmdb') ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  const tmdb = createProviderAdapter('tmdb', {
    apiKey,
    fetchImpl: app.providerFetch,
    cache: app.providerCache,
    stremioPublicId: config.identity?.stremioPublicId || 'imdb',
  });

  if (!(tmdb instanceof TmdbProviderAdapter)) {
    throw new ProviderError({
      code: 'upstream',
      providerId: 'tmdb',
      message: 'TMDB adapter unavailable',
      retryable: false,
    });
  }

  const ctx = {
    correlationId: input.correlationId,
    locale,
    region,
    apiKey,
  };

  const movie = await tmdb.getMovieByPublicId(ctx, input.id);

  const bag: ProviderFieldBag = {
    title: [{ provider: 'tmdb', value: movie.title, locale }],
    originalTitle: [{ provider: 'tmdb', value: movie.originalTitle ?? null }],
    description: [{ provider: 'tmdb', value: movie.overview ?? null, locale }],
    poster: [
      {
        provider: 'tmdb',
        value: tmdbImageUrl(movie.posterPath, 'w500'),
      },
    ],
    background: [
      {
        provider: 'tmdb',
        value: tmdbImageUrl(movie.backdropPath, 'w1280'),
      },
    ],
    rating: [
      {
        provider: 'tmdb',
        value: movie.voteAverage ?? null,
        confidence: 0.6,
      },
    ],
    voteCount: [],
    releaseDate: [{ provider: 'tmdb', value: movie.releaseDate ?? null }],
    externalIds: [
      {
        provider: 'tmdb',
        value: {
          tmdb: movie.id,
          imdb: movie.imdbId,
        },
      },
    ],
  };

  for (const fallback of fallbacks) {
    if (fallback === locale) continue;
    try {
      const alt = await tmdb.getMovieByPublicId(
        { ...ctx, locale: fallback },
        input.id,
      );
      bag.title!.push({ provider: 'tmdb', value: alt.title, locale: fallback });
      bag.description!.push({
        provider: 'tmdb',
        value: alt.overview ?? null,
        locale: fallback,
      });
    } catch {
      // ignore missing fallback locale fetch
    }
  }

  if (movie.imdbId) {
    try {
      const imdb = createProviderAdapter('imdb', {
        fetchImpl: app.providerFetch,
        cache: app.providerCache,
      });
      if (imdb instanceof ImdbRatingsAdapter) {
        const rating = await imdb.getRating(
          { correlationId: input.correlationId },
          movie.imdbId,
          input.mediaType === 'series' ? 'series' : 'movie',
        );
        bag.rating!.push({
          provider: 'imdb',
          value: rating.rating ?? null,
          confidence: 0.95,
        });
      }
    } catch {
      // rating optional
    }
  }

  const fanartKey = app.configStore.getSecretPlaintext(configId, 'fanart');
  if (fanartKey) {
    try {
      const fanart = createProviderAdapter('fanart', {
        apiKey: fanartKey,
        fetchImpl: app.providerFetch,
      });
      if (fanart instanceof FanartArtworkAdapter) {
        const art = await fanart.getMovieArtwork(
          {
            correlationId: input.correlationId,
            locale,
            region,
            apiKey: fanartKey,
          },
          movie.id,
        );
        const poster = pickAssetUrl(art.assets, 'poster');
        const background = pickAssetUrl(art.assets, 'background');
        if (poster) bag.poster!.unshift({ provider: 'fanart', value: poster });
        if (background) {
          bag.background!.unshift({ provider: 'fanart', value: background });
        }
      }
    } catch {
      // optional
    }
  }

  const rpdbKey = app.configStore.getSecretPlaintext(configId, 'rpdb');
  if (rpdbKey) {
    try {
      const rpdb = createProviderAdapter('rpdb', {
        apiKey: rpdbKey,
        fetchImpl: app.providerFetch,
      });
      if (rpdb instanceof RpdbArtworkAdapter) {
        const art = rpdb.getMovieArtwork(
          {
            correlationId: input.correlationId,
            locale,
            region,
            apiKey: rpdbKey,
          },
          movie.id,
        );
        const poster = pickAssetUrl(art.assets, 'poster');
        if (poster) bag.poster!.unshift({ provider: 'rpdb', value: poster });
      }
    } catch {
      // optional
    }
  }

  return { bag, publicId: movie.publicId };
}

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
      const access = requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);
      const view = app.configStore.getPublic(request.params.configId)!;
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
    const access = requireEdit(app, request, request.params.configId);
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

    const view = app.configStore.getPublic(request.params.configId)!;
    const updated = app.configStore.update(request.params.configId, {
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
    const access = requireEdit(app, request, request.params.configId);
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

    const view = app.configStore.getPublic(request.params.configId)!;
    const started = Date.now();

    try {
      let bag: ProviderFieldBag;
      let publicId: string | undefined;

      if (body.contributions) {
        bag = asBag(body.contributions);
        publicId = body.id;
      } else {
        const live = await gatherLiveBag(app, request.params.configId, view.config, {
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
        localization: view.config.localization,
        identity: {
          publicId,
          mediaType,
        },
        timingMs: Date.now() - started,
      });

      return {
        report,
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

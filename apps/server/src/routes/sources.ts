import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  ProviderError,
  buildProviderCacheKey,
  createProviderAdapter,
  getProvider,
  listAdapterProviderIds,
  listProviders,
  tmdbLocaleAdapter,
  languageOnlyLocaleAdapter,
  unsupportedLocaleAdapter,
  type ProviderLocaleAdapter,
} from '@metalayer/providers';

type TestSourceBody = {
  apiKey?: string;
  locale?: string;
  region?: string;
  configId?: string;
};

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

function localeAdapterFor(providerId: string): ProviderLocaleAdapter {
  switch (providerId) {
    case 'tmdb':
      return tmdbLocaleAdapter;
    case 'fanart':
      return languageOnlyLocaleAdapter;
    default:
      return unsupportedLocaleAdapter;
  }
}

function toPublicProvider(definition: ReturnType<typeof listProviders>[number]) {
  return {
    id: definition.id,
    name: definition.name,
    categories: definition.categories,
    connectionState: definition.connectionState,
    requiresCredential: definition.requiresCredential,
    requiresOAuth: definition.requiresOAuth,
    capabilities: definition.capabilities,
    adapterAvailable: listAdapterProviderIds().includes(definition.id),
  };
}

async function resolveApiKey(options: {
  app: { configStore: ConfigurationStore };
  request: FastifyRequest;
  reply: FastifyReply;
  providerId: string;
  body: TestSourceBody;
}): Promise<string | undefined | 'failed'> {
  if (options.body.apiKey) {
    return options.body.apiKey;
  }

  if (options.body.configId) {
    const credential = readEditCredential(options.request);
    if (!credential) {
      await options.reply.status(401).send(
        createApiError({
          code: 'EDIT_CREDENTIAL_INVALID',
          message: 'Missing X-MetaLayer-Edit-Credential header',
          correlationId: options.request.correlationId,
        }),
      );
      return 'failed';
    }

    if (!await options.app.configStore.verifyEditAccess(options.body.configId, credential)) {
      await options.reply.status(401).send(
        createApiError({
          code: 'EDIT_CREDENTIAL_INVALID',
          message: 'Edit credential is invalid',
          correlationId: options.request.correlationId,
        }),
      );
      return 'failed';
    }

    const fromVault = await options.app.configStore.getSecretPlaintext(
      options.body.configId,
      options.providerId,
    );
    if (!fromVault) {
      await options.reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: `No vaulted credential for provider ${options.providerId}`,
          correlationId: options.request.correlationId,
          params: { source: options.providerId },
        }),
      );
      return 'failed';
    }
    return fromVault;
  }

  if (options.providerId === 'tmdb') {
    return process.env.METALAYER_TMDB_API_KEY || process.env.TMDB_API || undefined;
  }

  return undefined;
}

export const sourcesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/sources', async (request) => {
    return {
      sources: listProviders().map(toPublicProvider),
      correlationId: request.correlationId,
    };
  });

  app.get<{ Params: { providerId: string } }>(
    '/sources/:providerId',
    async (request, reply) => {
      const definition = getProvider(request.params.providerId);
      if (!definition) {
        return reply.status(404).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${request.params.providerId} was not found`,
            correlationId: request.correlationId,
            params: { provider: request.params.providerId },
          }),
        );
      }

      const locale = localeAdapterFor(definition.id);
      return {
        source: toPublicProvider(definition),
        locale: {
          supportsLocale: locale.supportsLocale('en-US'),
          example: locale.toProviderLocale({ locale: 'pt-BR', region: 'BR' }),
          fallbacks: locale.getFallbacks('pt-BR'),
        },
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{ Params: { providerId: string }; Body: TestSourceBody }>(
    '/sources/:providerId/test',
    async (request, reply) => {
      const { providerId } = request.params;
      const definition = getProvider(providerId);
      if (!definition) {
        return reply.status(404).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${providerId} was not found`,
            correlationId: request.correlationId,
            params: { provider: providerId },
          }),
        );
      }

      const body = request.body ?? {};
      const apiKey = await resolveApiKey({
        app,
        request,
        reply,
        providerId,
        body,
      });
      if (apiKey === 'failed') return;

      const adapter = createProviderAdapter(providerId, {
        apiKey,
        fetchImpl: app.providerFetch,
        cache: app.providerCache,
      });
      if (!adapter) {
        return reply.status(400).send(
          createApiError({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${providerId} has no runnable adapter yet`,
            correlationId: request.correlationId,
            params: { provider: providerId },
          }),
        );
      }

      const locale = body.locale ?? 'en-US';
      const region = body.region;
      const localeAdapter = localeAdapterFor(providerId);
      const providerLocale = localeAdapter.toProviderLocale({ locale, region });
      const fallbacks = localeAdapter.getFallbacks(locale);
      const cacheKeyExample = buildProviderCacheKey({
        providerId,
        operation: 'ping',
        locale,
        region,
        fallbackChain: fallbacks,
      });

      try {
        const health = await adapter.ping({
          correlationId: request.correlationId,
          locale,
          region,
          apiKey,
        });

        return {
          providerId,
          ok: true,
          health,
          locale: {
            requested: locale,
            region,
            providerParams: providerLocale,
            fallbacks,
          },
          cacheKeyExample,
          correlationId: request.correlationId,
        };
      } catch (error) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError({
                code: 'upstream',
                providerId,
                message: 'Provider test failed',
                cause: error,
              });

        const status =
          providerError.code === 'auth'
            ? 400
            : providerError.code === 'unsupported'
              ? 501
              : 502;

        return reply.status(status).send({
          providerId,
          ok: false,
          health: adapter.getHealth(),
          error: {
            code:
              providerError.code === 'auth'
                ? 'SOURCE_CREDENTIAL_INVALID'
                : 'PROVIDER_UNAVAILABLE',
            providerCode: providerError.code,
            message: providerError.message,
          },
          locale: {
            requested: locale,
            region,
            providerParams: providerLocale,
            fallbacks,
          },
          cacheKeyExample,
          correlationId: request.correlationId,
        });
      }
    },
  );
};

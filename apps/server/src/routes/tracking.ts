import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import { evaluateRules, type RuleCandidate } from '@metalayer/rules';
import {
  annotateWatchedCandidates,
  safeLoadWatchStates,
  transitionTokenState,
  type TokenConnectionState,
  type TrackingProviderId,
  type WatchStateEntry,
} from '@metalayer/tracking';
import {
  SimklTrackingAdapter,
  TraktTrackingAdapter,
  createProviderAdapter,
} from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';

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

const TRACKING_PROVIDERS: TrackingProviderId[] = [
  'trakt',
  'simkl',
  'anilist',
  'mal',
  'kitsu',
];

function resolveConnectionState(
  app: { configStore: ConfigurationStore },
  configId: string,
  provider: TrackingProviderId,
): TokenConnectionState {
  const access =
    app.configStore.getSecretPlaintext(configId, provider, 'oauth_access') ||
    app.configStore.getSecretPlaintext(configId, provider, 'api_key');
  if (!access) return 'not_configured';
  return transitionTokenState('not_configured', { type: 'auth_success' });
}

export const trackingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/status',
    async (request, reply) => {
      const access = requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const providers = TRACKING_PROVIDERS.map((provider) => ({
        provider,
        state: resolveConnectionState(app, request.params.configId, provider),
        adapterAvailable: Boolean(createProviderAdapter(provider)),
      }));

      return {
        providers,
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string };
    Body: {
      provider?: TrackingProviderId;
      accessToken?: string;
      refreshToken?: string;
      fixtures?: WatchStateEntry[];
      fail?: boolean;
    };
  }>('/configurations/:configId/tracking/lookup', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.body?.provider ?? 'trakt';
    const vaultToken =
      app.configStore.getSecretPlaintext(
        request.params.configId,
        provider,
        'oauth_access',
      ) ||
      app.configStore.getSecretPlaintext(request.params.configId, provider, 'api_key');

    if (request.body?.accessToken) {
      app.configStore.upsertVaultSecret(
        request.params.configId,
        provider,
        'oauth_access',
        request.body.accessToken,
      );
    }
    if (request.body?.refreshToken) {
      app.configStore.upsertVaultSecret(
        request.params.configId,
        provider,
        'oauth_refresh',
        request.body.refreshToken,
      );
    }

    const result = await safeLoadWatchStates(provider, async () => {
      if (request.body?.fail) {
        throw new Error(`${provider} tracking unavailable`);
      }
      if (request.body?.fixtures) {
        return request.body.fixtures.map((item) => ({
          ...item,
          provider,
        }));
      }

      const adapter = createProviderAdapter(provider, {
        accessToken: request.body?.accessToken || vaultToken || undefined,
        fetchImpl: app.providerFetch,
      });

      if (
        adapter instanceof TraktTrackingAdapter ||
        adapter instanceof SimklTrackingAdapter
      ) {
        return adapter.getWatchStates();
      }

      return [];
    });

    return {
      provider,
      entries: result.entries,
      degraded: result.index.degraded,
      failure: result.failure,
      connectionState: result.failure
        ? transitionTokenState('connected', { type: 'upstream_error' })
        : resolveConnectionState(app, request.params.configId, provider),
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      items?: RuleCandidate[];
      hideWatched?: boolean;
      fixtures?: WatchStateEntry[];
      failTracking?: boolean;
      provider?: TrackingProviderId;
    };
  }>('/configurations/:configId/tracking/preview-hide-watched', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.body?.provider ?? 'trakt';
    const items = request.body?.items ?? [];

    const loaded = await safeLoadWatchStates(provider, async () => {
      if (request.body?.failTracking) {
        throw new Error('tracking failed');
      }
      return (request.body?.fixtures ?? []).map((item) => ({
        ...item,
        provider,
      }));
    });

    const annotated = annotateWatchedCandidates(
      items,
      loaded.index.degraded ? null : loaded.index,
      (item) => ({ imdb: item.id, tmdb: item.id }),
    );

    const hideWatched = request.body?.hideWatched ?? true;
    const included: string[] = [];
    const excluded: string[] = [];
    for (const item of annotated) {
      const result = evaluateRules(item, { hideWatched });
      if (result.include) included.push(item.id);
      else excluded.push(item.id);
    }

    // Exit criterion: tracking failure must not break the response.
    return {
      included,
      excluded,
      degraded: loaded.index.degraded,
      failure: loaded.failure,
      ok: true,
      correlationId: request.correlationId,
    };
  });
};

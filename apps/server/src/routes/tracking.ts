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
  AnilistTrackingAdapter,
  MalTrackingAdapter,
  ProviderError,
  SimklTrackingAdapter,
  TraktTrackingAdapter,
  buildAnilistAuthorizeUrl,
  buildMalAuthorizeUrl,
  buildSimklAuthorizeUrl,
  buildTraktAuthorizeUrl,
  createProviderAdapter,
  exchangeAnilistAuthorizationCode,
  exchangeMalAuthorizationCode,
  exchangeSimklAuthorizationCode,
  exchangeTraktAuthorizationCode,
  generateMalPkceVerifier,
} from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';
import type { ProviderHealthRegistry, TmdbFetch } from '@metalayer/providers';
import { randomBytes } from 'node:crypto';
import {
  REFRESHABLE_TRACKING_PROVIDERS,
  clearTrackingAccessTokens,
  persistTrackingOAuthMetadata,
  tryRefreshTrackingToken,
} from '../tracking-token-refresh.js';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

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

const TRACKING_PROVIDERS: TrackingProviderId[] = [
  'trakt',
  'simkl',
  'anilist',
  'mal',
  'kitsu',
];

async function resolveConnectionState(
  app: { configStore: ConfigurationStore },
  configId: string,
  provider: TrackingProviderId,
): Promise<TokenConnectionState> {
  const access =
    await app.configStore.getSecretPlaintext(configId, provider, 'oauth_access') ||
    await app.configStore.getSecretPlaintext(configId, provider, 'api_key');
  if (!access) {
    // Refresh token without access means a prior refresh failed — prompt reconnect.
    const refresh = await app.configStore.getSecretPlaintext(
      configId,
      provider,
      'oauth_refresh',
    );
    return refresh
      ? transitionTokenState('connected', { type: 'refresh_failed' })
      : 'not_configured';
  }
  return transitionTokenState('not_configured', { type: 'auth_success' });
}

const REFRESHABLE_PROVIDERS = REFRESHABLE_TRACKING_PROVIDERS;

function isTrackingAdapter(
  adapter: unknown,
): adapter is
  | TraktTrackingAdapter
  | SimklTrackingAdapter
  | AnilistTrackingAdapter
  | MalTrackingAdapter {
  return (
    adapter instanceof TraktTrackingAdapter ||
    adapter instanceof SimklTrackingAdapter ||
    adapter instanceof AnilistTrackingAdapter ||
    adapter instanceof MalTrackingAdapter
  );
}

async function loadLiveWatchStates(input: {
  app: {
    configStore: ConfigurationStore;
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
  };
  configId: string;
  provider: TrackingProviderId;
  accessToken?: string;
  correlationId: string;
}): Promise<WatchStateEntry[]> {
  const run = async (token: string | undefined) => {
    const adapter = createAppProviderAdapter(input.app, input.provider, {
      accessToken: token,
    });
    if (!isTrackingAdapter(adapter)) return [] as WatchStateEntry[];
    return adapter.getWatchStates({
      correlationId: input.correlationId,
    }) as Promise<WatchStateEntry[]>;
  };

  try {
    return await run(input.accessToken);
  } catch (error) {
    if (!(error instanceof ProviderError) || error.code !== 'auth') {
      throw error;
    }

    try {
      const refreshed = await tryRefreshTrackingToken({
        store: input.app.configStore,
        configId: input.configId,
        provider: input.provider,
        fetchImpl: input.app.providerFetch,
      });
      if (refreshed) {
        return await run(refreshed.accessToken);
      }
    } catch {
      // Refresh failed — fall through to clear access and rethrow.
    }

    // SIMKL/AniList have no refresh grant; Trakt/MAL refresh missing/failed.
    // Keep refresh token (if any) so status can surface `expired` + Connect.
    await clearTrackingAccessTokens(input.app.configStore, input.configId, input.provider, {
      keepRefresh: REFRESHABLE_PROVIDERS.has(input.provider),
    });
    throw error;
  }
}

export const trackingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/status',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      const providers = await Promise.all(
        TRACKING_PROVIDERS.map(async (provider) => ({
          provider,
          state: await resolveConnectionState(app, request.params.configId, provider),
          adapterAvailable: Boolean(createProviderAdapter(provider)),
        })),
      );

      return {
        providers,
        correlationId: request.correlationId,
      };
    },
  );

  app.post<{
    Params: { configId: string; provider: string };
  }>('/configurations/:configId/tracking/:provider/refresh', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.params.provider as TrackingProviderId;
    if (!REFRESHABLE_PROVIDERS.has(provider)) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: `Provider ${provider} does not support token refresh`,
          correlationId: request.correlationId,
          params: { field: 'provider' },
        }),
      );
    }

    try {
      const refreshed = await tryRefreshTrackingToken({
        store: app.configStore,
        configId: request.params.configId,
        provider,
        fetchImpl: app.providerFetch,
      });
      if (!refreshed) {
        await clearTrackingAccessTokens(app.configStore, request.params.configId, provider, {
          keepRefresh: true,
        });
        return {
          refreshed: false,
          state: transitionTokenState('connected', {
            type: 'refresh_failed',
          }),
          correlationId: request.correlationId,
        };
      }
      return {
        refreshed: true,
        state: 'connected' as const,
        correlationId: request.correlationId,
      };
    } catch {
      await clearTrackingAccessTokens(app.configStore, request.params.configId, provider, {
        keepRefresh: true,
      });
      return {
        refreshed: false,
        state: transitionTokenState('connected', { type: 'refresh_failed' }),
        correlationId: request.correlationId,
      };
    }
  });

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
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.body?.provider ?? 'trakt';
    const vaultToken =
      await app.configStore.getSecretPlaintext(
        request.params.configId,
        provider,
        'oauth_access',
      ) ||
      await app.configStore.getSecretPlaintext(request.params.configId, provider, 'api_key');

    if (request.body?.accessToken) {
      await app.configStore.upsertVaultSecret(
        request.params.configId,
        provider,
        'oauth_access',
        request.body.accessToken,
      );
    }
    if (request.body?.refreshToken) {
      await app.configStore.upsertVaultSecret(
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

      return loadLiveWatchStates({
        app,
        configId: request.params.configId,
        provider,
        accessToken: request.body?.accessToken || vaultToken || undefined,
        correlationId: request.correlationId,
      });
    });

    return {
      provider,
      entries: result.entries,
      degraded: result.index.degraded,
      failure: result.failure,
      connectionState: await (async () => {
        const resolved = await resolveConnectionState(
          app,
          request.params.configId,
          provider,
        );
        if (!result.failure) return resolved;
        if (resolved === 'expired') return 'expired';
        if (resolved === 'not_configured') {
          return transitionTokenState('connected', { type: 'unauthorized' });
        }
        return transitionTokenState('connected', { type: 'upstream_error' });
      })(),
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
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const provider = request.body?.provider ?? 'trakt';
    const items = request.body?.items ?? [];
    const vaultToken =
      await app.configStore.getSecretPlaintext(
        request.params.configId,
        provider,
        'oauth_access',
      ) ||
      await app.configStore.getSecretPlaintext(
        request.params.configId,
        provider,
        'api_key',
      );

    const loaded = await safeLoadWatchStates(provider, async () => {
      if (request.body?.failTracking) {
        throw new Error('tracking failed');
      }
      if (request.body?.fixtures) {
        return (request.body.fixtures ?? []).map((item) => ({
          ...item,
          provider,
        }));
      }

      return loadLiveWatchStates({
        app,
        configId: request.params.configId,
        provider,
        accessToken: vaultToken || undefined,
        correlationId: request.correlationId,
      });
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

  app.get<{
    Params: { configId: string };
    Querystring: { redirectUri?: string };
  }>('/configurations/:configId/tracking/trakt/auth-url', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.TRAKT_CLIENT_ID;
    if (!clientId) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'TRAKT_CLIENT_ID is not configured on this instance',
          correlationId: request.correlationId,
          params: { source: 'Trakt' },
        }),
      );
    }

    const redirectUri =
      request.query.redirectUri ||
      process.env.TRAKT_REDIRECT_URI ||
      '';
    if (!redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'redirectUri is required',
          correlationId: request.correlationId,
          params: { field: 'redirectUri' },
        }),
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        configId: request.params.configId,
        nonce: randomBytes(8).toString('hex'),
      }),
    ).toString('base64url');

    return {
      authUrl: buildTraktAuthorizeUrl({
        clientId,
        redirectUri,
        state,
      }),
      state,
      redirectUri,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { code?: string; redirectUri?: string };
  }>('/configurations/:configId/tracking/trakt/callback', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.TRAKT_CLIENT_ID;
    const clientSecret = process.env.TRAKT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'TRAKT_CLIENT_ID/TRAKT_CLIENT_SECRET are not configured',
          correlationId: request.correlationId,
          params: { source: 'Trakt' },
        }),
      );
    }

    const code = request.body?.code;
    const redirectUri =
      request.body?.redirectUri || process.env.TRAKT_REDIRECT_URI || '';
    if (!code || !redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'code and redirectUri are required',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const tokens = await exchangeTraktAuthorizationCode({
        code,
        redirectUri,
        clientId,
        clientSecret,
        fetchImpl: app.providerFetch,
      });
      await app.configStore.upsertVaultSecret(
        request.params.configId,
        'trakt',
        'oauth_access',
        tokens.accessToken,
      );
      if (tokens.refreshToken) {
        await app.configStore.upsertVaultSecret(
          request.params.configId,
          'trakt',
          'oauth_refresh',
          tokens.refreshToken,
        );
      }
      await persistTrackingOAuthMetadata(
        app.configStore,
        request.params.configId,
        'trakt',
        tokens.expiresIn,
      );
      return {
        connected: true,
        state: 'connected' as const,
        correlationId: request.correlationId,
      };
    } catch (error) {
      return reply.status(502).send(
        createApiError({
          code: 'PROVIDER_UNAVAILABLE',
          message:
            error instanceof Error ? error.message : 'Trakt OAuth callback failed',
          correlationId: request.correlationId,
          params: { source: 'Trakt' },
        }),
      );
    }
  });

  app.delete<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/trakt',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'trakt',
        'oauth_access',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'trakt',
        'oauth_refresh',
      );
      // Legacy create-path may have stored trakt under api_key kind.
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'trakt',
        'api_key',
      );

      return {
        connected: false,
        state: 'not_configured' as const,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{
    Params: { configId: string };
    Querystring: { redirectUri?: string };
  }>('/configurations/:configId/tracking/simkl/auth-url', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'SIMKL_CLIENT_ID is not configured on this instance',
          correlationId: request.correlationId,
          params: { source: 'SIMKL' },
        }),
      );
    }

    const redirectUri =
      request.query.redirectUri || process.env.SIMKL_REDIRECT_URI || '';
    if (!redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'redirectUri is required',
          correlationId: request.correlationId,
          params: { field: 'redirectUri' },
        }),
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        configId: request.params.configId,
        nonce: randomBytes(8).toString('hex'),
      }),
    ).toString('base64url');

    return {
      authUrl: buildSimklAuthorizeUrl({
        clientId,
        redirectUri,
        state,
      }),
      state,
      redirectUri,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { code?: string; redirectUri?: string };
  }>('/configurations/:configId/tracking/simkl/callback', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.SIMKL_CLIENT_ID;
    const clientSecret = process.env.SIMKL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'SIMKL_CLIENT_ID/SIMKL_CLIENT_SECRET are not configured',
          correlationId: request.correlationId,
          params: { source: 'SIMKL' },
        }),
      );
    }

    const code = request.body?.code;
    const redirectUri =
      request.body?.redirectUri || process.env.SIMKL_REDIRECT_URI || '';
    if (!code || !redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'code and redirectUri are required',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const tokens = await exchangeSimklAuthorizationCode({
        code,
        redirectUri,
        clientId,
        clientSecret,
        fetchImpl: app.providerFetch,
      });
      await app.configStore.upsertVaultSecret(
        request.params.configId,
        'simkl',
        'oauth_access',
        tokens.accessToken,
      );
      if (tokens.refreshToken) {
        await app.configStore.upsertVaultSecret(
          request.params.configId,
          'simkl',
          'oauth_refresh',
          tokens.refreshToken,
        );
      }
      return {
        connected: true,
        state: 'connected' as const,
        correlationId: request.correlationId,
      };
    } catch (error) {
      return reply.status(502).send(
        createApiError({
          code: 'PROVIDER_UNAVAILABLE',
          message:
            error instanceof Error ? error.message : 'SIMKL OAuth callback failed',
          correlationId: request.correlationId,
          params: { source: 'SIMKL' },
        }),
      );
    }
  });

  app.delete<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/simkl',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'simkl',
        'oauth_access',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'simkl',
        'oauth_refresh',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'simkl',
        'api_key',
      );

      return {
        connected: false,
        state: 'not_configured' as const,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{
    Params: { configId: string };
    Querystring: { redirectUri?: string };
  }>('/configurations/:configId/tracking/anilist/auth-url', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.ANILIST_CLIENT_ID;
    if (!clientId) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'ANILIST_CLIENT_ID is not configured on this instance',
          correlationId: request.correlationId,
          params: { source: 'AniList' },
        }),
      );
    }

    const redirectUri =
      request.query.redirectUri || process.env.ANILIST_REDIRECT_URI || '';
    if (!redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'redirectUri is required',
          correlationId: request.correlationId,
          params: { field: 'redirectUri' },
        }),
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        configId: request.params.configId,
        nonce: randomBytes(8).toString('hex'),
      }),
    ).toString('base64url');

    return {
      authUrl: buildAnilistAuthorizeUrl({
        clientId,
        redirectUri,
        state,
      }),
      state,
      redirectUri,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { code?: string; redirectUri?: string };
  }>('/configurations/:configId/tracking/anilist/callback', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.ANILIST_CLIENT_ID;
    const clientSecret = process.env.ANILIST_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'ANILIST_CLIENT_ID/ANILIST_CLIENT_SECRET are not configured',
          correlationId: request.correlationId,
          params: { source: 'AniList' },
        }),
      );
    }

    const code = request.body?.code;
    const redirectUri =
      request.body?.redirectUri || process.env.ANILIST_REDIRECT_URI || '';
    if (!code || !redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'code and redirectUri are required',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const tokens = await exchangeAnilistAuthorizationCode({
        code,
        redirectUri,
        clientId,
        clientSecret,
        fetchImpl: app.providerFetch,
      });
      await app.configStore.upsertVaultSecret(
        request.params.configId,
        'anilist',
        'oauth_access',
        tokens.accessToken,
      );
      if (tokens.refreshToken) {
        await app.configStore.upsertVaultSecret(
          request.params.configId,
          'anilist',
          'oauth_refresh',
          tokens.refreshToken,
        );
      }
      return {
        connected: true,
        state: 'connected' as const,
        correlationId: request.correlationId,
      };
    } catch (error) {
      return reply.status(502).send(
        createApiError({
          code: 'PROVIDER_UNAVAILABLE',
          message:
            error instanceof Error
              ? error.message
              : 'AniList OAuth callback failed',
          correlationId: request.correlationId,
          params: { source: 'AniList' },
        }),
      );
    }
  });

  app.delete<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/anilist',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'anilist',
        'oauth_access',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'anilist',
        'oauth_refresh',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'anilist',
        'api_key',
      );

      return {
        connected: false,
        state: 'not_configured' as const,
        correlationId: request.correlationId,
      };
    },
  );

  app.get<{
    Params: { configId: string };
    Querystring: { redirectUri?: string };
  }>('/configurations/:configId/tracking/mal/auth-url', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.MAL_CLIENT_ID;
    if (!clientId) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'MAL_CLIENT_ID is not configured on this instance',
          correlationId: request.correlationId,
          params: { source: 'MyAnimeList' },
        }),
      );
    }

    const redirectUri =
      request.query.redirectUri || process.env.MAL_REDIRECT_URI || '';
    if (!redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'redirectUri is required',
          correlationId: request.correlationId,
          params: { field: 'redirectUri' },
        }),
      );
    }

    const nonce = randomBytes(8).toString('hex');
    const codeVerifier = generateMalPkceVerifier();
    const state = Buffer.from(
      JSON.stringify({
        configId: request.params.configId,
        nonce,
      }),
    ).toString('base64url');

    // Persist PKCE verifier until callback (MAL requires plain code_challenge).
    await app.configStore.upsertVaultSecret(
      request.params.configId,
      'mal',
      'session',
      JSON.stringify({ nonce, codeVerifier }),
    );

    return {
      authUrl: buildMalAuthorizeUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge: codeVerifier,
      }),
      state,
      redirectUri,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { code?: string; redirectUri?: string; state?: string };
  }>('/configurations/:configId/tracking/mal/callback', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const clientId = process.env.MAL_CLIENT_ID;
    const clientSecret = process.env.MAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply.status(400).send(
        createApiError({
          code: 'SOURCE_CREDENTIAL_MISSING',
          message: 'MAL_CLIENT_ID/MAL_CLIENT_SECRET are not configured',
          correlationId: request.correlationId,
          params: { source: 'MyAnimeList' },
        }),
      );
    }

    const code = request.body?.code;
    const redirectUri =
      request.body?.redirectUri || process.env.MAL_REDIRECT_URI || '';
    if (!code || !redirectUri) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'code and redirectUri are required',
          correlationId: request.correlationId,
        }),
      );
    }

    const sessionRaw = await app.configStore.getSecretPlaintext(
      request.params.configId,
      'mal',
      'session',
    );
    let codeVerifier: string | undefined;
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw) as {
          nonce?: string;
          codeVerifier?: string;
        };
        if (request.body?.state) {
          const decoded = JSON.parse(
            Buffer.from(request.body.state, 'base64url').toString('utf8'),
          ) as { nonce?: string };
          if (decoded.nonce && session.nonce && decoded.nonce !== session.nonce) {
            return reply.status(400).send(
              createApiError({
                code: 'VALIDATION_FAILED',
                message: 'OAuth state nonce mismatch',
                correlationId: request.correlationId,
              }),
            );
          }
        }
        codeVerifier = session.codeVerifier;
      } catch {
        codeVerifier = undefined;
      }
    }
    if (!codeVerifier) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'MAL PKCE session is missing; restart Connect',
          correlationId: request.correlationId,
        }),
      );
    }

    try {
      const tokens = await exchangeMalAuthorizationCode({
        code,
        redirectUri,
        clientId,
        clientSecret,
        codeVerifier,
        fetchImpl: app.providerFetch,
      });
      await app.configStore.upsertVaultSecret(
        request.params.configId,
        'mal',
        'oauth_access',
        tokens.accessToken,
      );
      if (tokens.refreshToken) {
        await app.configStore.upsertVaultSecret(
          request.params.configId,
          'mal',
          'oauth_refresh',
          tokens.refreshToken,
        );
      }
      await persistTrackingOAuthMetadata(
        app.configStore,
        request.params.configId,
        'mal',
        tokens.expiresIn,
      );
      return {
        connected: true,
        state: 'connected' as const,
        correlationId: request.correlationId,
      };
    } catch (error) {
      return reply.status(502).send(
        createApiError({
          code: 'PROVIDER_UNAVAILABLE',
          message:
            error instanceof Error ? error.message : 'MAL OAuth callback failed',
          correlationId: request.correlationId,
          params: { source: 'MyAnimeList' },
        }),
      );
    }
  });

  app.delete<{ Params: { configId: string } }>(
    '/configurations/:configId/tracking/mal',
    async (request, reply) => {
      const access = await requireEdit(app, request, request.params.configId);
      if (!access.ok) return reply.status(access.status).send(access.body);

      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'mal',
        'oauth_access',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'mal',
        'oauth_refresh',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'mal',
        'session',
      );
      await app.configStore.deleteVaultSecret(
        request.params.configId,
        'mal',
        'api_key',
      );

      return {
        connected: false,
        state: 'not_configured' as const,
        correlationId: request.correlationId,
      };
    },
  );
};

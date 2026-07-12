import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 37).toString('base64');

describe('@metalayer/server tracking', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('reports tracking status and applies hideWatched without breaking on failure', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'tracking-edit',
        secrets: { trakt: 'trakt-access-token' },
        config: createDefaultMetaLayerConfig({
          name: 'Tracking',
          globalRules: { hideWatched: true },
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'tracking-edit' };

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    expect(status.statusCode).toBe(200);
    const trakt = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'trakt');
    expect(trakt.state).toBe('connected');
    expect(trakt.adapterAvailable).toBe(true);

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/preview-hide-watched`,
      headers,
      payload: {
        hideWatched: true,
        items: [
          { id: 'tt0137523', title: 'Fight Club' },
          { id: 'tt0111161', title: 'Shawshank' },
        ],
        fixtures: [
          {
            provider: 'trakt',
            mediaType: 'movie',
            status: 'completed',
            externalIds: { imdb: 'tt0137523' },
          },
        ],
      },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().ok).toBe(true);
    expect(preview.json().excluded).toEqual(['tt0137523']);
    expect(preview.json().included).toEqual(['tt0111161']);
    expect(preview.json().degraded).toBe(false);

    const failed = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/preview-hide-watched`,
      headers,
      payload: {
        hideWatched: true,
        failTracking: true,
        items: [
          { id: 'tt0137523', title: 'Fight Club' },
          { id: 'tt0111161', title: 'Shawshank' },
        ],
      },
    });
    expect(failed.statusCode).toBe(200);
    expect(failed.json().ok).toBe(true);
    expect(failed.json().degraded).toBe(true);
    // Without watch annotations, hideWatched cannot exclude — metadata path stays up.
    expect(failed.json().included.sort()).toEqual(['tt0111161', 'tt0137523']);
    expect(failed.json().failure?.code).toBe('upstream');
  });

  it('stores oauth access/refresh kinds without exposing plaintext', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'OAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'oauth-edit' };

    const lookup = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/lookup`,
      headers,
      payload: {
        provider: 'trakt',
        accessToken: 'access-secret-value',
        refreshToken: 'refresh-secret-value',
        fixtures: [],
      },
    });
    expect(lookup.statusCode).toBe(200);
    expect(JSON.stringify(lookup.json())).not.toContain('access-secret-value');
    expect(JSON.stringify(lookup.json())).not.toContain('refresh-secret-value');
    expect(lookup.json().connectionState).toBe('connected');
  });

  it('builds Trakt auth URL, exchanges code into vault, and disconnects', async () => {
    const previousId = process.env.TRAKT_CLIENT_ID;
    const previousSecret = process.env.TRAKT_CLIENT_SECRET;
    process.env.TRAKT_CLIENT_ID = 'trakt-client';
    process.env.TRAKT_CLIENT_SECRET = 'trakt-secret';

    const store = createMemoryConfigurationStore(Buffer.alloc(32, 38).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url, init) => {
        expect(String(url)).toContain('oauth/token');
        expect(init?.method).toBe('POST');
        return new Response(
          JSON.stringify({
            access_token: 'live-access',
            refresh_token: 'live-refresh',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'trakt-oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'TraktOAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'trakt-oauth-edit' };
    const redirectUri = 'http://localhost:1338/configure/oauth/trakt/callback';

    const authUrl = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/trakt/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
      headers,
    });
    expect(authUrl.statusCode).toBe(200);
    expect(authUrl.json().authUrl).toContain('trakt.tv/oauth/authorize');
    expect(authUrl.json().authUrl).toContain('trakt-client');

    const callback = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/trakt/callback`,
      headers,
      payload: { code: 'auth-code', redirectUri },
    });
    expect(callback.statusCode).toBe(200);
    expect(callback.json().connected).toBe(true);
    expect(JSON.stringify(callback.json())).not.toContain('live-access');

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    const trakt = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'trakt');
    expect(trakt.state).toBe('connected');

    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/configurations/${configId}/tracking/trakt`,
      headers,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().state).toBe('not_configured');

    await app.close();
    process.env.TRAKT_CLIENT_ID = previousId;
    process.env.TRAKT_CLIENT_SECRET = previousSecret;
  });

  it('builds SIMKL auth URL, exchanges code into vault, and disconnects', async () => {
    const previousId = process.env.SIMKL_CLIENT_ID;
    const previousSecret = process.env.SIMKL_CLIENT_SECRET;
    process.env.SIMKL_CLIENT_ID = 'simkl-client';
    process.env.SIMKL_CLIENT_SECRET = 'simkl-secret';

    const store = createMemoryConfigurationStore(Buffer.alloc(32, 39).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url, init) => {
        expect(String(url)).toContain('api.simkl.com/oauth/token');
        expect(init?.method).toBe('POST');
        return new Response(
          JSON.stringify({
            access_token: 'simkl-live-access',
            expires_in: 157680000,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'simkl-oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'SimklOAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'simkl-oauth-edit' };
    const redirectUri = 'http://localhost:1338/configure/oauth/simkl/callback';

    const authUrl = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/simkl/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
      headers,
    });
    expect(authUrl.statusCode).toBe(200);
    expect(authUrl.json().authUrl).toContain('simkl.com/oauth/authorize');
    expect(authUrl.json().authUrl).toContain('simkl-client');

    const callback = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/simkl/callback`,
      headers,
      payload: { code: 'auth-code', redirectUri },
    });
    expect(callback.statusCode).toBe(200);
    expect(callback.json().connected).toBe(true);
    expect(JSON.stringify(callback.json())).not.toContain('simkl-live-access');

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    const simkl = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'simkl');
    expect(simkl.state).toBe('connected');

    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/configurations/${configId}/tracking/simkl`,
      headers,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().state).toBe('not_configured');

    await app.close();
    process.env.SIMKL_CLIENT_ID = previousId;
    process.env.SIMKL_CLIENT_SECRET = previousSecret;
  });

  it('builds AniList auth URL, exchanges code into vault, and disconnects', async () => {
    const previousId = process.env.ANILIST_CLIENT_ID;
    const previousSecret = process.env.ANILIST_CLIENT_SECRET;
    process.env.ANILIST_CLIENT_ID = 'anilist-client';
    process.env.ANILIST_CLIENT_SECRET = 'anilist-secret';

    const store = createMemoryConfigurationStore(Buffer.alloc(32, 40).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url, init) => {
        expect(String(url)).toContain('anilist.co/api/v2/oauth/token');
        expect(init?.method).toBe('POST');
        return new Response(
          JSON.stringify({
            access_token: 'anilist-live-access',
            token_type: 'Bearer',
            expires_in: 31536000,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'anilist-oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'AniListOAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'anilist-oauth-edit' };
    const redirectUri = 'http://localhost:1338/configure/oauth/anilist/callback';

    const authUrl = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/anilist/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
      headers,
    });
    expect(authUrl.statusCode).toBe(200);
    expect(authUrl.json().authUrl).toContain('anilist.co/api/v2/oauth/authorize');
    expect(authUrl.json().authUrl).toContain('anilist-client');

    const callback = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/anilist/callback`,
      headers,
      payload: { code: 'auth-code', redirectUri },
    });
    expect(callback.statusCode).toBe(200);
    expect(callback.json().connected).toBe(true);
    expect(JSON.stringify(callback.json())).not.toContain('anilist-live-access');

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    const anilist = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'anilist');
    expect(anilist.state).toBe('connected');

    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/configurations/${configId}/tracking/anilist`,
      headers,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().state).toBe('not_configured');

    await app.close();
    process.env.ANILIST_CLIENT_ID = previousId;
    process.env.ANILIST_CLIENT_SECRET = previousSecret;
  });

  it('builds MAL auth URL with PKCE, exchanges code into vault, and disconnects', async () => {
    const previousId = process.env.MAL_CLIENT_ID;
    const previousSecret = process.env.MAL_CLIENT_SECRET;
    process.env.MAL_CLIENT_ID = 'mal-client';
    process.env.MAL_CLIENT_SECRET = 'mal-secret';

    const store = createMemoryConfigurationStore(Buffer.alloc(32, 41).toString('base64'));
    let capturedVerifier: string | undefined;
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url, init) => {
        expect(String(url)).toContain('myanimelist.net/v1/oauth2/token');
        expect(init?.method).toBe('POST');
        const body = String(init?.body ?? '');
        expect(body).toContain('code_verifier=');
        expect(body).toContain('grant_type=authorization_code');
        const match = /code_verifier=([^&]+)/.exec(body);
        capturedVerifier = match?.[1] ? decodeURIComponent(match[1]) : undefined;
        return new Response(
          JSON.stringify({
            access_token: 'mal-live-access',
            refresh_token: 'mal-live-refresh',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'mal-oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'MalOAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'mal-oauth-edit' };
    const redirectUri = 'http://localhost:1338/configure/oauth/mal/callback';

    const authUrl = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/mal/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
      headers,
    });
    expect(authUrl.statusCode).toBe(200);
    expect(authUrl.json().authUrl).toContain('myanimelist.net/v1/oauth2/authorize');
    expect(authUrl.json().authUrl).toContain('code_challenge=');
    expect(authUrl.json().authUrl).toContain('mal-client');
    const state = authUrl.json().state as string;

    const callback = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/mal/callback`,
      headers,
      payload: { code: 'auth-code', redirectUri, state },
    });
    expect(callback.statusCode).toBe(200);
    expect(callback.json().connected).toBe(true);
    expect(JSON.stringify(callback.json())).not.toContain('mal-live-access');
    expect(capturedVerifier).toBeTruthy();
    expect(capturedVerifier!.length).toBeGreaterThanOrEqual(43);

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    const mal = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'mal');
    expect(mal.state).toBe('connected');

    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/configurations/${configId}/tracking/mal`,
      headers,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().state).toBe('not_configured');

    await app.close();
    process.env.MAL_CLIENT_ID = previousId;
    process.env.MAL_CLIENT_SECRET = previousSecret;
  });
});

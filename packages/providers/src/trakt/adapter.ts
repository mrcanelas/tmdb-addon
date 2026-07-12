import { ProviderError } from '../core/errors.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  type ProviderAdapter,
  type ProviderContext,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from '../core/runtime.js';
import { unsupportedLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';
import type { ProviderFetch } from '../artwork/types.js';

export interface TraktWatchStateFixture {
  imdb?: string;
  tmdb?: number;
  mediaType: 'movie' | 'series' | 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  progress?: number;
}

export interface TraktOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface TraktAdapterOptions {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  /** Injectable fixture for CI — preferred over live sync in unit tests. */
  fixtures?: TraktWatchStateFixture[];
}

export function buildTraktAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
  });
  return `https://trakt.tv/oauth/authorize?${params.toString()}`;
}

export async function exchangeTraktAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: ProviderFetch;
}): Promise<TraktOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl('https://api.trakt.tv/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    throw new ProviderError({
      code: response.status === 401 ? 'auth' : 'upstream',
      providerId: 'trakt',
      message: `Trakt token exchange failed (${response.status})`,
      retryable: response.status >= 500,
    });
  }
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new ProviderError({
      code: 'upstream',
      providerId: 'trakt',
      message: 'Trakt token exchange returned no access_token',
      retryable: false,
    });
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  };
}

export async function refreshTraktAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  fetchImpl?: ProviderFetch;
}): Promise<TraktOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl('https://api.trakt.tv/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri:
        input.redirectUri ||
        process.env.TRAKT_REDIRECT_URI ||
        'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    throw new ProviderError({
      code: response.status === 401 ? 'auth' : 'upstream',
      providerId: 'trakt',
      message: `Trakt token refresh failed (${response.status})`,
      retryable: response.status >= 500,
    });
  }
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new ProviderError({
      code: 'upstream',
      providerId: 'trakt',
      message: 'Trakt token refresh returned no access_token',
      retryable: false,
    });
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  };
}

/**
 * Trakt tracking adapter (independent MetaLayer implementation).
 * Supports fixture mode for CI and live watched sync when an access token is set.
 */
export class TraktTrackingAdapter implements ProviderAdapter {
  readonly id = 'trakt';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly accessToken?: string;
  private readonly clientId?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: TraktWatchStateFixture[];

  constructor(options: TraktAdapterOptions = {}) {
    const definition = getProvider('trakt');
    if (!definition) throw new Error('Trakt is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.accessToken = options.accessToken;
    this.clientId = options.clientId ?? process.env.TRAKT_CLIENT_ID;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    if (!this.accessToken && this.fixtures.length === 0) {
      const response = await this.fetchImpl('https://api.trakt.tv/', {
        method: 'GET',
        signal: ctx.signal,
        headers: {
          'trakt-api-version': '2',
          'X-Correlation-Id': ctx.correlationId,
        },
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(`Trakt ping failed (${response.status})`);
      }
    }
    return this.getHealth();
  }

  async getWatchStates(
    ctx?: ProviderContext,
  ): Promise<
    Array<{
      provider: 'trakt';
      mediaType: 'movie' | 'series' | 'anime';
      status: TraktWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }>
  > {
    if (this.fixtures.length > 0 || !this.accessToken) {
      return this.fixtures.map((item) => ({
        provider: 'trakt' as const,
        mediaType: item.mediaType,
        status: item.status,
        progress: item.progress,
        externalIds: {
          ...(item.imdb ? { imdb: item.imdb } : {}),
          ...(item.tmdb !== undefined ? { tmdb: item.tmdb } : {}),
        },
      }));
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (this.clientId) headers['trakt-api-key'] = this.clientId;
    if (ctx?.correlationId) headers['X-Correlation-Id'] = ctx.correlationId;

    const [moviesResponse, showsResponse] = await Promise.all([
      this.fetchImpl('https://api.trakt.tv/sync/watched/movies', {
        method: 'GET',
        signal: ctx?.signal,
        headers,
      }),
      this.fetchImpl('https://api.trakt.tv/sync/watched/shows', {
        method: 'GET',
        signal: ctx?.signal,
        headers,
      }),
    ]);

    if (!moviesResponse.ok || !showsResponse.ok) {
      const status = !moviesResponse.ok
        ? moviesResponse.status
        : showsResponse.status;
      throw new ProviderError({
        code: status === 401 ? 'auth' : 'upstream',
        providerId: this.id,
        message: `Trakt watched sync failed (${status})`,
        retryable: status >= 500,
      });
    }

    const movies = (await moviesResponse.json()) as Array<{
      movie?: { ids?: { imdb?: string; tmdb?: number } };
    }>;
    const shows = (await showsResponse.json()) as Array<{
      show?: { ids?: { imdb?: string; tmdb?: number } };
    }>;

    const entries: Array<{
      provider: 'trakt';
      mediaType: 'movie' | 'series' | 'anime';
      status: TraktWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }> = [];

    for (const item of movies) {
      const ids = item.movie?.ids;
      if (!ids?.imdb && ids?.tmdb === undefined) continue;
      entries.push({
        provider: 'trakt',
        mediaType: 'movie',
        status: 'completed',
        externalIds: {
          ...(ids.imdb ? { imdb: ids.imdb } : {}),
          ...(ids.tmdb !== undefined ? { tmdb: ids.tmdb } : {}),
        },
      });
    }

    for (const item of shows) {
      const ids = item.show?.ids;
      if (!ids?.imdb && ids?.tmdb === undefined) continue;
      entries.push({
        provider: 'trakt',
        mediaType: 'series',
        status: 'completed',
        externalIds: {
          ...(ids.imdb ? { imdb: ids.imdb } : {}),
          ...(ids.tmdb !== undefined ? { tmdb: ids.tmdb } : {}),
        },
      });
    }

    return entries;
  }
}

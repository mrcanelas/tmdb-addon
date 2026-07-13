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

export interface SimklWatchStateFixture {
  imdb?: string;
  tmdb?: number;
  mediaType: 'movie' | 'series' | 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
}

export interface SimklOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface SimklAdapterOptions {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  /** Injectable fixture for CI — preferred over live sync in unit tests. */
  fixtures?: SimklWatchStateFixture[];
  health?: ProviderHealthTracker;
}

const SIMKL_APP_NAME = 'metalayer';
const SIMKL_APP_VERSION = '1.0';

function simklQuery(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    'app-name': SIMKL_APP_NAME,
    'app-version': SIMKL_APP_VERSION,
  });
  return params.toString();
}

export function buildSimklAuthorizeUrl(input: {
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
  return `https://simkl.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeSimklAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: ProviderFetch;
}): Promise<SimklOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `https://api.simkl.com/oauth/token?${simklQuery(input.clientId)}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `${SIMKL_APP_NAME}/${SIMKL_APP_VERSION}`,
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
      providerId: 'simkl',
      message: `SIMKL token exchange failed (${response.status})`,
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
      providerId: 'simkl',
      message: 'SIMKL token exchange returned no access_token',
      retryable: false,
    });
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  };
}

function coerceTmdb(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

type SimklIds = { imdb?: string; tmdb?: string | number; simkl?: number };
type SimklSyncItem = {
  status?: string;
  movie?: { ids?: SimklIds };
  show?: { ids?: SimklIds };
  anime?: { ids?: SimklIds };
};

function mapSimklStatus(
  status: string | undefined,
): SimklWatchStateFixture['status'] {
  switch ((status ?? 'completed').toLowerCase()) {
    case 'watching':
      return 'watching';
    case 'plantowatch':
    case 'plan_to_watch':
      return 'plan_to_watch';
    case 'hold':
    case 'on_hold':
      return 'on_hold';
    case 'dropped':
      return 'dropped';
    default:
      return 'completed';
  }
}

function pushFromIds(
  entries: Array<{
    provider: 'simkl';
    mediaType: 'movie' | 'series' | 'anime';
    status: SimklWatchStateFixture['status'];
    externalIds: Record<string, string | number>;
  }>,
  mediaType: 'movie' | 'series' | 'anime',
  status: string | undefined,
  ids: SimklIds | undefined,
) {
  if (!ids) return;
  const tmdb = coerceTmdb(ids.tmdb);
  if (!ids.imdb && tmdb === undefined) return;
  entries.push({
    provider: 'simkl',
    mediaType,
    status: mapSimklStatus(status),
    externalIds: {
      ...(ids.imdb ? { imdb: ids.imdb } : {}),
      ...(tmdb !== undefined ? { tmdb } : {}),
      ...(ids.simkl !== undefined ? { simkl: ids.simkl } : {}),
    },
  });
}

/**
 * SIMKL tracking adapter.
 * Supports fixture mode for CI and live completed-library sync when an access token is set.
 */
export class SimklTrackingAdapter implements ProviderAdapter {
  readonly id = 'simkl';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly accessToken?: string;
  private readonly clientId?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: SimklWatchStateFixture[];

  constructor(options: SimklAdapterOptions = {}) {
    const definition = getProvider('simkl');
    if (!definition) throw new Error('SIMKL is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.accessToken = options.accessToken;
    this.clientId = options.clientId ?? process.env.SIMKL_CLIENT_ID;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    if (!this.accessToken && this.fixtures.length === 0) {
      const clientId = this.clientId ?? 'anonymous';
      const response = await this.fetchImpl(
        `https://api.simkl.com/?${simklQuery(clientId)}`,
        {
          method: 'GET',
          signal: ctx.signal,
          headers: {
            'User-Agent': `${SIMKL_APP_NAME}/${SIMKL_APP_VERSION}`,
            'X-Correlation-Id': ctx.correlationId,
          },
        },
      );
      if (!response.ok && response.status !== 401) {
        throw new Error(`SIMKL ping failed (${response.status})`);
      }
    }
    return this.getHealth();
  }

  async getWatchStates(
    ctx?: ProviderContext,
  ): Promise<
    Array<{
      provider: 'simkl';
      mediaType: 'movie' | 'series' | 'anime';
      status: SimklWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
    }>
  > {
    if (this.fixtures.length > 0 || !this.accessToken) {
      return this.fixtures.map((item) => ({
        provider: 'simkl' as const,
        mediaType: item.mediaType,
        status: item.status,
        externalIds: {
          ...(item.imdb ? { imdb: item.imdb } : {}),
          ...(item.tmdb !== undefined ? { tmdb: item.tmdb } : {}),
        },
      }));
    }

    if (!this.clientId) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'SIMKL_CLIENT_ID is required for live watched sync',
        retryable: false,
      });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `${SIMKL_APP_NAME}/${SIMKL_APP_VERSION}`,
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (ctx?.correlationId) headers['X-Correlation-Id'] = ctx.correlationId;

    // SIMKL docs: pull completed libraries sequentially, not in parallel.
    const segments: Array<{
      path: string;
      mediaType: 'movie' | 'series' | 'anime';
      key: 'movies' | 'shows' | 'anime';
    }> = [
      { path: 'movies/completed', mediaType: 'movie', key: 'movies' },
      { path: 'shows/completed', mediaType: 'series', key: 'shows' },
      { path: 'anime/completed', mediaType: 'anime', key: 'anime' },
    ];

    const entries: Array<{
      provider: 'simkl';
      mediaType: 'movie' | 'series' | 'anime';
      status: SimklWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
    }> = [];

    for (const segment of segments) {
      const url =
        `https://api.simkl.com/sync/all-items/${segment.path}` +
        `?extended=ids_only&${simklQuery(this.clientId)}`;
      const response = await this.fetchImpl(url, {
        method: 'GET',
        signal: ctx?.signal,
        headers,
      });
      if (!response.ok) {
        throw new ProviderError({
          code: response.status === 401 ? 'auth' : 'upstream',
          providerId: this.id,
          message: `SIMKL watched sync failed (${response.status})`,
          retryable: response.status >= 500,
        });
      }
      const body = (await response.json()) as Record<string, SimklSyncItem[]>;
      const items = body[segment.key] ?? [];
      for (const item of items) {
        if (segment.mediaType === 'movie') {
          pushFromIds(entries, 'movie', item.status, item.movie?.ids);
        } else if (segment.mediaType === 'series') {
          pushFromIds(entries, 'series', item.status, item.show?.ids);
        } else {
          pushFromIds(
            entries,
            'anime',
            item.status,
            item.anime?.ids ?? item.show?.ids,
          );
        }
      }
    }

    return entries;
  }
}

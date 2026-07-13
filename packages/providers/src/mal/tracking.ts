import { randomBytes } from 'node:crypto';
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

export interface MalWatchStateFixture {
  mal?: number;
  mediaType: 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  progress?: number;
}

export interface MalOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface MalTrackingAdapterOptions {
  accessToken?: string;
  clientId?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  fixtures?: MalWatchStateFixture[];
  health?: ProviderHealthTracker;
}

/** MAL PKCE uses plain method: code_challenge === code_verifier (43–128 chars). */
export function generateMalPkceVerifier(): string {
  // Unreserved URI characters, length 64 (within 43–128).
  return randomBytes(48).toString('base64url');
}

export function buildMalAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'plain',
  });
  return `https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`;
}

async function parseMalTokenResponse(
  response: Response,
  failureLabel: string,
): Promise<MalOAuthTokens> {
  if (!response.ok) {
    throw new ProviderError({
      code: response.status === 401 ? 'auth' : 'upstream',
      providerId: 'mal',
      message: `${failureLabel} (${response.status})`,
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
      providerId: 'mal',
      message: `${failureLabel}: no access_token`,
      retryable: false,
    });
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  };
}

export async function exchangeMalAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
  fetchImpl?: ProviderFetch;
}): Promise<MalOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const response = await fetchImpl('https://myanimelist.net/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return parseMalTokenResponse(response, 'MAL token exchange failed');
}

export async function refreshMalAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: ProviderFetch;
}): Promise<MalOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  });
  const response = await fetchImpl('https://myanimelist.net/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return parseMalTokenResponse(response, 'MAL token refresh failed');
}

function mapMalStatus(
  status: string | undefined,
): MalWatchStateFixture['status'] {
  switch ((status ?? 'completed').toLowerCase()) {
    case 'watching':
      return 'watching';
    case 'plan_to_watch':
      return 'plan_to_watch';
    case 'on_hold':
      return 'on_hold';
    case 'dropped':
      return 'dropped';
    default:
      return 'completed';
  }
}

/**
 * MAL official API tracking adapter (OAuth + PKCE).
 * Metadata/catalog remains on MalJikanProviderAdapter.
 */
export class MalTrackingAdapter implements ProviderAdapter {
  readonly id = 'mal';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly accessToken?: string;
  private readonly clientId?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: MalWatchStateFixture[];

  constructor(options: MalTrackingAdapterOptions = {}) {
    const definition = getProvider('mal');
    if (!definition) throw new Error('MAL is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.accessToken = options.accessToken;
    this.clientId = options.clientId ?? process.env.MAL_CLIENT_ID;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    void ctx;
    return this.getHealth();
  }

  async getWatchStates(
    ctx?: ProviderContext,
  ): Promise<
    Array<{
      provider: 'mal';
      mediaType: 'anime';
      status: MalWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }>
  > {
    if (this.fixtures.length > 0 || !this.accessToken) {
      return this.fixtures.map((item) => ({
        provider: 'mal' as const,
        mediaType: 'anime' as const,
        status: item.status,
        progress: item.progress,
        externalIds: {
          ...(item.mal !== undefined ? { mal: item.mal } : {}),
        },
      }));
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (this.clientId) headers['X-MAL-CLIENT-ID'] = this.clientId;
    if (ctx?.correlationId) headers['X-Correlation-Id'] = ctx.correlationId;

    const entries: Array<{
      provider: 'mal';
      mediaType: 'anime';
      status: MalWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }> = [];

    let nextUrl: string | null =
      'https://api.myanimelist.net/v2/users/@me/animelist' +
      '?status=completed&limit=100&fields=list_status';

    while (nextUrl) {
      const response = await this.fetchImpl(nextUrl, {
        method: 'GET',
        signal: ctx?.signal,
        headers,
      });
      if (!response.ok) {
        throw new ProviderError({
          code: response.status === 401 ? 'auth' : 'upstream',
          providerId: this.id,
          message: `MAL watched sync failed (${response.status})`,
          retryable: response.status >= 500,
        });
      }
      const body = (await response.json()) as {
        data?: Array<{
          node?: { id?: number };
          list_status?: {
            status?: string;
            num_episodes_watched?: number;
          };
        }>;
        paging?: { next?: string };
      };

      for (const item of body.data ?? []) {
        const id = item.node?.id;
        if (id === undefined) continue;
        entries.push({
          provider: 'mal',
          mediaType: 'anime',
          status: mapMalStatus(item.list_status?.status),
          progress: item.list_status?.num_episodes_watched,
          externalIds: { mal: id },
        });
      }

      nextUrl = body.paging?.next ?? null;
    }

    return entries;
  }
}

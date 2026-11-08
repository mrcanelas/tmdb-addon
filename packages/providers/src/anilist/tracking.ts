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
import {
  sliceListPage,
  type AccountCatalogDescriptor,
  type ListCatalogItem,
  type ListCatalogPage,
} from '../lists/types.js';

export interface AnilistWatchStateFixture {
  anilist?: number;
  mal?: number;
  mediaType: 'anime';
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  progress?: number;
}

export interface AnilistOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AnilistTrackingAdapterOptions {
  accessToken?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  fixtures?: AnilistWatchStateFixture[];
  graphqlUrl?: string;
  health?: ProviderHealthTracker;
}

export function buildAnilistAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    state: input.state,
  });
  return `https://anilist.co/api/v2/oauth/authorize?${params.toString()}`;
}

export async function exchangeAnilistAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: ProviderFetch;
}): Promise<AnilistOAuthTokens> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl('https://anilist.co/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
    }),
  });
  if (!response.ok) {
    throw new ProviderError({
      code: response.status === 401 ? 'auth' : 'upstream',
      providerId: 'anilist',
      message: `AniList token exchange failed (${response.status})`,
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
      providerId: 'anilist',
      message: 'AniList token exchange returned no access_token',
      retryable: false,
    });
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  };
}

function mapAnilistStatus(
  status: string | undefined,
): AnilistWatchStateFixture['status'] {
  switch ((status ?? 'COMPLETED').toUpperCase()) {
    case 'CURRENT':
      return 'watching';
    case 'PLANNING':
      return 'plan_to_watch';
    case 'PAUSED':
      return 'on_hold';
    case 'DROPPED':
      return 'dropped';
    case 'REPEATING':
      return 'watching';
    default:
      return 'completed';
  }
}

const VIEWER_ID_QUERY = `
query MetaLayerViewerId {
  Viewer {
    id
  }
}
`;

/** `anilist.user.{status}` catalogs. */
export const ANILIST_USER_LIST_STATUSES: Record<string, string> = {
  current: 'CURRENT',
  planning: 'PLANNING',
  completed: 'COMPLETED',
  paused: 'PAUSED',
  dropped: 'DROPPED',
  repeating: 'REPEATING',
};

export const ANILIST_ACCOUNT_CATALOGS: AccountCatalogDescriptor[] = Object.keys(
  ANILIST_USER_LIST_STATUSES,
).map((status) => ({
  provider: 'anilist',
  providerCatalogId: `user.${status}`,
  mediaTypes: ['anime'],
  name: `AniList ${status[0].toUpperCase() + status.slice(1)}`,
  requiresCredential: true,
}));

const USER_LIST_QUERY = `
query MetaLayerUserList($userId: Int!, $status: MediaListStatus!) {
  MediaListCollection(userId: $userId, type: ANIME, status: $status, sort: UPDATED_TIME_DESC) {
    lists {
      entries {
        score
        media {
          id
          idMal
          format
          seasonYear
          averageScore
          title { romaji english native }
          coverImage { large }
        }
      }
    }
  }
}
`;

const COMPLETED_LIST_QUERY = `
query MetaLayerCompletedAnime($userId: Int!) {
  MediaListCollection(userId: $userId, type: ANIME, status: COMPLETED) {
    lists {
      entries {
        status
        progress
        media {
          id
          idMal
        }
      }
    }
  }
}
`;

/**
 * AniList tracking adapter — OAuth + completed anime MediaListCollection.
 * Metadata catalog/meta remains on AnilistProviderAdapter.
 */
export class AnilistTrackingAdapter implements ProviderAdapter {
  readonly id = 'anilist';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly accessToken?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly fixtures: AnilistWatchStateFixture[];
  private readonly graphqlUrl: string;

  constructor(options: AnilistTrackingAdapterOptions = {}) {
    const definition = getProvider('anilist');
    if (!definition) throw new Error('AniList is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.fixtures = options.fixtures ?? [];
    this.graphqlUrl = (
      options.graphqlUrl ?? 'https://graphql.anilist.co'
    ).replace(/\/$/, '');
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
      provider: 'anilist';
      mediaType: 'anime';
      status: AnilistWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }>
  > {
    if (this.fixtures.length > 0 || !this.accessToken) {
      return this.fixtures.map((item) => ({
        provider: 'anilist' as const,
        mediaType: 'anime' as const,
        status: item.status,
        progress: item.progress,
        externalIds: {
          ...(item.anilist !== undefined ? { anilist: item.anilist } : {}),
          ...(item.mal !== undefined ? { mal: item.mal } : {}),
        },
      }));
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (ctx?.correlationId) headers['X-Correlation-Id'] = ctx.correlationId;

    const viewerResponse = await this.fetchImpl(this.graphqlUrl, {
      method: 'POST',
      signal: ctx?.signal,
      headers,
      body: JSON.stringify({ query: VIEWER_ID_QUERY }),
    });
    if (!viewerResponse.ok) {
      throw new ProviderError({
        code: viewerResponse.status === 401 ? 'auth' : 'upstream',
        providerId: this.id,
        message: `AniList viewer lookup failed (${viewerResponse.status})`,
        retryable: viewerResponse.status >= 500,
      });
    }
    const viewerBody = (await viewerResponse.json()) as {
      errors?: Array<{ message?: string }>;
      data?: { Viewer?: { id?: number } | null };
    };
    const userId = viewerBody.data?.Viewer?.id;
    if (viewerBody.errors?.length || userId === undefined) {
      throw new ProviderError({
        code: 'upstream',
        providerId: this.id,
        message:
          viewerBody.errors?.[0]?.message ??
          'AniList Viewer id missing for MediaListCollection',
        retryable: false,
      });
    }

    const response = await this.fetchImpl(this.graphqlUrl, {
      method: 'POST',
      signal: ctx?.signal,
      headers,
      body: JSON.stringify({
        query: COMPLETED_LIST_QUERY,
        variables: { userId },
      }),
    });

    if (!response.ok) {
      throw new ProviderError({
        code: response.status === 401 ? 'auth' : 'upstream',
        providerId: this.id,
        message: `AniList watched sync failed (${response.status})`,
        retryable: response.status >= 500,
      });
    }

    const body = (await response.json()) as {
      errors?: Array<{ message?: string }>;
      data?: {
        MediaListCollection?: {
          lists?: Array<{
            entries?: Array<{
              status?: string;
              progress?: number;
              media?: { id?: number; idMal?: number | null };
            } | null>;
          } | null>;
        } | null;
      };
    };

    if (body.errors?.length) {
      throw new ProviderError({
        code: 'upstream',
        providerId: this.id,
        message: body.errors[0]?.message ?? 'AniList GraphQL error',
        retryable: false,
      });
    }

    const entries: Array<{
      provider: 'anilist';
      mediaType: 'anime';
      status: AnilistWatchStateFixture['status'];
      externalIds: Record<string, string | number>;
      progress?: number;
    }> = [];

    for (const list of body.data?.MediaListCollection?.lists ?? []) {
      for (const entry of list?.entries ?? []) {
        const id = entry?.media?.id;
        if (id === undefined) continue;
        entries.push({
          provider: 'anilist',
          mediaType: 'anime',
          status: mapAnilistStatus(entry?.status),
          progress: entry?.progress,
          externalIds: {
            anilist: id,
            ...(entry?.media?.idMal != null ? { mal: entry.media.idMal } : {}),
          },
        });
      }
    }

    return entries;
  }

  /** `user.{status}` catalog page from the viewer's MediaListCollection. */
  async getCatalogPage(
    ctx: ProviderContext,
    input: { providerCatalogId: string; mediaType: 'movie' | 'series' | 'anime'; page?: number },
  ): Promise<ListCatalogPage> {
    const statusKey = input.providerCatalogId.replace(/^user\./, '');
    const status = ANILIST_USER_LIST_STATUSES[statusKey];
    if (!status) {
      throw new ProviderError({
        code: 'unsupported',
        providerId: this.id,
        message: `AniList catalog ${input.providerCatalogId} is not supported`,
        retryable: false,
      });
    }
    if (!this.accessToken) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'AniList access token is required for user list catalogs',
        retryable: false,
      });
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      'X-Correlation-Id': ctx.correlationId,
    };
    const viewer = await this.graphql<{ Viewer?: { id?: number } | null }>(
      ctx,
      headers,
      VIEWER_ID_QUERY,
    );
    const userId = viewer.Viewer?.id;
    if (userId === undefined) {
      throw new ProviderError({
        code: 'upstream',
        providerId: this.id,
        message: 'AniList Viewer id missing',
        retryable: false,
      });
    }
    const data = await this.graphql<{
      MediaListCollection?: {
        lists?: Array<{
          entries?: Array<{
            score?: number;
            media?: {
              id?: number;
              idMal?: number | null;
              format?: string;
              seasonYear?: number | null;
              averageScore?: number | null;
              title?: { romaji?: string; english?: string; native?: string };
              coverImage?: { large?: string };
            };
          } | null>;
        } | null>;
      } | null;
    }>(ctx, headers, USER_LIST_QUERY, { userId, status });

    const items: ListCatalogItem[] = [];
    for (const list of data.MediaListCollection?.lists ?? []) {
      for (const entry of list?.entries ?? []) {
        const media = entry?.media;
        if (media?.id === undefined) continue;
        items.push({
          publicId: `anilist:${media.id}`,
          mediaType: 'anime',
          name: media.title?.english || media.title?.romaji || media.title?.native || `AniList ${media.id}`,
          year: media.seasonYear ?? undefined,
          rating: typeof media.averageScore === 'number' ? media.averageScore / 10 : undefined,
          posterUrl: media.coverImage?.large,
          position: items.length + 1,
          externalIds: {
            anilist: media.id,
            ...(media.idMal != null ? { mal: media.idMal } : {}),
          },
        });
      }
    }
    return sliceListPage(items, input.page ?? 1);
  }

  private async graphql<T>(
    ctx: ProviderContext,
    headers: Record<string, string>,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.fetchImpl(this.graphqlUrl, {
      method: 'POST',
      signal: ctx.signal,
      headers,
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    if (!response.ok) {
      throw new ProviderError({
        code: response.status === 401 ? 'auth' : 'upstream',
        providerId: this.id,
        message: `AniList request failed (${response.status})`,
        retryable: response.status >= 500,
      });
    }
    const body = (await response.json()) as { errors?: Array<{ message?: string }>; data?: T };
    if (body.errors?.length || !body.data) {
      throw new ProviderError({
        code: 'upstream',
        providerId: this.id,
        message: body.errors?.[0]?.message ?? 'AniList GraphQL error',
        retryable: false,
      });
    }
    return body.data;
  }
}

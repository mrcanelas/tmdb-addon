import { ProviderError, classifyHttpStatus } from '../core/errors.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  withRetry,
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
  LIST_PAGE_SIZE,
  publicIdFromExternalIds,
  type AccountCatalogDescriptor,
  type ListCatalogItem,
  type ListCatalogPage,
} from '../lists/types.js';

/** Trakt catalogs MetaLayer can serve (AGENTS.md §8.2, §12.2). */
export const TRAKT_ACCOUNT_CATALOGS: AccountCatalogDescriptor[] = [
  {
    provider: 'trakt',
    providerCatalogId: 'watchlist',
    mediaTypes: ['movie', 'series'],
    name: 'Trakt Watchlist',
    requiresCredential: true,
  },
  {
    provider: 'trakt',
    providerCatalogId: 'recommendations',
    mediaTypes: ['movie', 'series'],
    name: 'Trakt Recommendations',
    requiresCredential: true,
  },
  {
    provider: 'trakt',
    providerCatalogId: 'trending',
    mediaTypes: ['movie', 'series'],
    name: 'Trakt Trending',
    requiresCredential: false,
  },
  {
    provider: 'trakt',
    providerCatalogId: 'popular',
    mediaTypes: ['movie', 'series'],
    name: 'Trakt Popular',
    requiresCredential: false,
  },
];

interface TraktIds {
  trakt?: number;
  slug?: string;
  imdb?: string;
  tmdb?: number;
}

interface TraktMediaObject {
  title?: string;
  year?: number;
  ids?: TraktIds;
  rating?: number;
  images?: { poster?: string[] };
}

interface TraktListEntry {
  type?: 'movie' | 'show' | 'season' | 'episode' | 'person';
  rank?: number;
  movie?: TraktMediaObject;
  show?: TraktMediaObject;
}

export interface TraktUserList {
  slug: string;
  name: string;
  itemCount?: number;
}

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
  health?: ProviderHealthTracker;
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
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
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

  /** Personal lists of the connected account (for the Studio source picker). */
  async getUserLists(ctx?: ProviderContext): Promise<TraktUserList[]> {
    const body = await this.requestJson<
      Array<{ name?: string; ids?: { slug?: string }; item_count?: number }>
    >(ctx, 'https://api.trakt.tv/users/me/lists', { auth: true });
    return body
      .filter((list) => list.ids?.slug)
      .map((list) => ({
        slug: String(list.ids!.slug),
        name: list.name ?? String(list.ids!.slug),
        itemCount: list.item_count,
      }));
  }

  /**
   * Catalog page for `watchlist`, `recommendations`, `trending`, `popular`
   * and `list.{slug}` (personal list). Items keep list order (`position`).
   */
  async getCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
    },
  ): Promise<ListCatalogPage> {
    if (input.mediaType === 'anime') return { items: [], hasMore: false };
    const mediaType: 'movie' | 'series' = input.mediaType;
    const page = input.page ?? 1;
    const segment = mediaType === 'movie' ? 'movies' : 'shows';
    const pageQuery = `page=${page}&limit=${LIST_PAGE_SIZE}&extended=images`;

    let path: string;
    let auth = false;
    switch (true) {
      case input.providerCatalogId === 'watchlist':
        path = `https://api.trakt.tv/sync/watchlist/${segment}/rank?${pageQuery}`;
        auth = true;
        break;
      case input.providerCatalogId === 'recommendations':
        path = `https://api.trakt.tv/recommendations/${segment}?${pageQuery}&ignore_collected=true`;
        auth = true;
        break;
      case input.providerCatalogId === 'trending':
        path = `https://api.trakt.tv/${segment}/trending?${pageQuery}`;
        break;
      case input.providerCatalogId === 'popular':
        path = `https://api.trakt.tv/${segment}/popular?${pageQuery}`;
        break;
      case input.providerCatalogId.startsWith('list.'): {
        const slug = encodeURIComponent(input.providerCatalogId.slice('list.'.length));
        path = `https://api.trakt.tv/users/me/lists/${slug}/items/${segment}?${pageQuery}`;
        auth = true;
        break;
      }
      default:
        throw new ProviderError({
          code: 'unsupported',
          providerId: this.id,
          message: `Trakt catalog ${input.providerCatalogId} is not supported`,
          retryable: false,
        });
    }

    const raw = await this.requestJson<Array<TraktListEntry | TraktMediaObject>>(
      ctx,
      path,
      { auth },
    );
    const items: ListCatalogItem[] = [];
    raw.forEach((entry, index) => {
      const media = unwrapTraktMedia(entry, mediaType);
      if (!media) return;
      const publicId = publicIdFromExternalIds(
        { imdb: media.ids?.imdb, tmdb: media.ids?.tmdb },
        media.ids?.slug ? `trakt:${media.ids.slug}` : undefined,
      );
      if (!publicId) return;
      const poster = media.images?.poster?.[0];
      items.push({
        publicId,
        mediaType,
        name: media.title ?? publicId,
        year: media.year,
        rating: media.rating,
        posterUrl: poster ? (poster.startsWith('http') ? poster : `https://${poster}`) : undefined,
        position: (entry as TraktListEntry).rank ?? (page - 1) * LIST_PAGE_SIZE + index + 1,
        externalIds: {
          ...(media.ids?.imdb ? { imdb: media.ids.imdb } : {}),
          ...(media.ids?.tmdb !== undefined ? { tmdb: media.ids.tmdb } : {}),
          ...(media.ids?.trakt !== undefined ? { trakt: media.ids.trakt } : {}),
        },
      });
    });
    return { items, hasMore: raw.length >= LIST_PAGE_SIZE };
  }

  private async requestJson<T>(
    ctx: ProviderContext | undefined,
    url: string,
    options: { auth: boolean },
  ): Promise<T> {
    if (!this.clientId) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'TRAKT_CLIENT_ID is required for Trakt catalogs',
        retryable: false,
      });
    }
    if (options.auth && !this.accessToken) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'Trakt access token is required for this catalog',
        retryable: false,
      });
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': this.clientId,
    };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    if (ctx?.correlationId) headers['X-Correlation-Id'] = ctx.correlationId;

    return withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx?.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(url, { method: 'GET', signal, headers });
        if (!response.ok) throw classifyHttpStatus(response.status, this.id);
        return (await response.json()) as T;
      },
    });
  }
}

function unwrapTraktMedia(
  entry: TraktListEntry | TraktMediaObject,
  mediaType: 'movie' | 'series',
): TraktMediaObject | undefined {
  const wrapped = entry as TraktListEntry;
  if (wrapped.movie || wrapped.show) {
    if (wrapped.type && wrapped.type !== (mediaType === 'movie' ? 'movie' : 'show')) {
      return undefined;
    }
    return mediaType === 'movie' ? wrapped.movie : wrapped.show;
  }
  const bare = entry as TraktMediaObject;
  return bare.ids ? bare : undefined;
}

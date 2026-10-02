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

export const MDBLIST_BASE_URL = 'https://api.mdblist.com';

export interface MdblistAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

export interface MdblistListSummary {
  id: number;
  name: string;
  slug?: string;
  mediaType?: 'movie' | 'series';
  items?: number;
}

interface MdblistRawItem {
  id?: number;
  rank?: number;
  title?: string;
  imdb_id?: string | null;
  release_year?: number;
  adult?: number | boolean;
  mediatype?: string;
}

/**
 * MDBList adapter — user lists and top lists (AGENTS.md §8.2 catalog providers).
 * Independent MetaLayer implementation of the public MDBList API.
 *
 * `providerCatalogId` values: `{listId}` (legacy TMDB Addon), `list.{listId}`,
 * or `list.{user}/{slug}`.
 */
export class MdblistAdapter implements ProviderAdapter {
  readonly id = 'mdblist';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly defaultApiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: MdblistAdapterOptions = {}) {
    const definition = getProvider('mdblist');
    if (!definition) throw new Error('MDBList is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.defaultApiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? MDBLIST_BASE_URL).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    await this.requestJson<unknown>(ctx, '/user');
    return this.getHealth();
  }

  /** Lists owned by the API key holder. */
  async getUserLists(ctx: ProviderContext): Promise<MdblistListSummary[]> {
    const raw = await this.requestJson<
      Array<{
        id?: number;
        name?: string;
        slug?: string;
        mediatype?: string;
        items?: number;
      }>
    >(ctx, '/lists/user');
    return (Array.isArray(raw) ? raw : [])
      .filter((list) => typeof list.id === 'number')
      .map((list) => ({
        id: list.id!,
        name: list.name ?? `List ${list.id}`,
        slug: list.slug,
        mediaType:
          list.mediatype === 'movie'
            ? 'movie'
            : list.mediatype === 'show'
              ? 'series'
              : undefined,
        items: list.items,
      }));
  }

  describeCatalogs(lists: MdblistListSummary[]): AccountCatalogDescriptor[] {
    return lists.map((list) => ({
      provider: 'mdblist',
      providerCatalogId: `list.${list.id}`,
      mediaTypes: list.mediaType ? [list.mediaType] : ['movie', 'series'],
      name: list.name,
      requiresCredential: true,
    }));
  }

  async getCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
    },
  ): Promise<ListCatalogPage> {
    if (input.mediaType === 'anime') return { items: [], hasMore: false };
    const page = input.page ?? 1;
    const listRef = input.providerCatalogId.startsWith('list.')
      ? input.providerCatalogId.slice('list.'.length)
      : input.providerCatalogId;
    const path = /^\d+$/.test(listRef)
      ? `/lists/${listRef}/items`
      : `/lists/${listRef
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')}/items`;
    const raw = await this.requestJson<
      { movies?: MdblistRawItem[]; shows?: MdblistRawItem[] } | MdblistRawItem[]
    >(ctx, path, {
      limit: String(LIST_PAGE_SIZE),
      offset: String((page - 1) * LIST_PAGE_SIZE),
    });

    const bucket: MdblistRawItem[] = Array.isArray(raw)
      ? raw.filter((item) =>
          input.mediaType === 'movie'
            ? item.mediatype !== 'show'
            : item.mediatype === 'show',
        )
      : input.mediaType === 'movie'
        ? (raw.movies ?? [])
        : (raw.shows ?? []);

    const items: ListCatalogItem[] = [];
    bucket.forEach((item, index) => {
      const publicId = publicIdFromExternalIds({
        imdb: item.imdb_id ?? undefined,
        tmdb: item.id,
      });
      if (!publicId) return;
      items.push({
        publicId,
        mediaType: input.mediaType,
        name: item.title ?? publicId,
        year: item.release_year,
        position: item.rank ?? (page - 1) * LIST_PAGE_SIZE + index + 1,
        externalIds: {
          ...(item.imdb_id ? { imdb: item.imdb_id } : {}),
          ...(item.id !== undefined ? { tmdb: item.id } : {}),
        },
      });
    });
    return { items, hasMore: bucket.length >= LIST_PAGE_SIZE };
  }

  private resolveApiKey(ctx?: ProviderContext): string {
    const apiKey = ctx?.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'MDBList API key is missing',
        retryable: false,
      });
    }
    return apiKey;
  }

  private async requestJson<T>(
    ctx: ProviderContext,
    path: string,
    query: Record<string, string> = {},
  ): Promise<T> {
    const apiKey = this.resolveApiKey(ctx);
    // MDBList authenticates through the query string; the URL must never be logged.
    const params = new URLSearchParams({ apikey: apiKey, ...query });
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    return withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          signal,
          headers: {
            Accept: 'application/json',
            'X-Correlation-Id': ctx.correlationId,
          },
        });
        if (!response.ok) throw classifyHttpStatus(response.status, this.id);
        return (await response.json()) as T;
      },
    });
  }
}

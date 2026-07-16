import { ProviderError } from '../core/errors.js';
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
  fetchPublicMetaDBListItems,
  fetchPublicMetaDBLists,
  fetchPublicMetaDBPickItems,
  fetchPublicMetaDBPicks,
  fetchPublicMetaDBResume,
  isPublicMetaDBApiKey,
  markPublicMetaDBWatched,
  type PublicMetaDBListSummary,
  type PublicMetaDBMediaRef,
  type PublicMetaDBMediaType,
  type PublicMetaDBPaginated,
  type PublicMetaDBPickSummary,
  validatePublicMetaDBKey,
} from './client.js';

export interface PublicMetaDBCatalogItem {
  publicId: string;
  mediaType: 'movie' | 'series';
  name: string;
}

export interface PublicMetaDBAdapterOptions {
  apiKey?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
  /** Injectable fixtures for catalog/tracking tests. */
  resumeFixture?: PublicMetaDBMediaRef[];
  listsFixture?: PublicMetaDBListSummary[];
  picksFixture?: PublicMetaDBPickSummary[];
}

/**
 * PublicMetaDB adapter — personal lists, Up Next, picks, and watch tracking.
 * Independent MetaLayer implementation based on the public external API.
 */
export class PublicMetaDBAdapter implements ProviderAdapter {
  readonly id = 'publicmetadb';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly defaultApiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly resumeFixture?: PublicMetaDBMediaRef[];
  private readonly listsFixture?: PublicMetaDBListSummary[];
  private readonly picksFixture?: PublicMetaDBPickSummary[];

  constructor(options: PublicMetaDBAdapterOptions = {}) {
    const definition = getProvider('publicmetadb');
    if (!definition) {
      throw new Error('PublicMetaDB is missing from PROVIDER_REGISTRY');
    }
    this.definition = definition;
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.resumeFixture = options.resumeFixture;
    this.listsFixture = options.listsFixture;
    this.picksFixture = options.picksFixture;
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    const apiKey = this.resolveApiKey(ctx);
    if (!isPublicMetaDBApiKey(apiKey)) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'PublicMetaDB API keys must start with pm-',
        retryable: false,
      });
    }

    await withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const valid = await validatePublicMetaDBKey({
          apiKey,
          fetchImpl: this.fetchImpl,
          signal,
          correlationId: ctx.correlationId,
        });
        if (!valid) {
          throw new ProviderError({
            code: 'auth',
            providerId: this.id,
            message: 'PublicMetaDB API key validation failed',
            retryable: false,
          });
        }
        return true;
      },
    });

    return this.getHealth();
  }

  async getResume(ctx?: ProviderContext): Promise<PublicMetaDBMediaRef[]> {
    if (this.resumeFixture) return this.resumeFixture;
    const apiKey = this.resolveApiKey(ctx);
    return fetchPublicMetaDBResume({
      apiKey,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  async listLists(
    ctx: ProviderContext | undefined,
    page = 1,
    perPage = 50,
  ): Promise<PublicMetaDBPaginated<PublicMetaDBListSummary>> {
    if (this.listsFixture) {
      return { items: this.listsFixture, page, perPage, total: this.listsFixture.length };
    }
    const apiKey = this.resolveApiKey(ctx);
    return fetchPublicMetaDBLists({
      apiKey,
      page,
      perPage,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  async listListItems(
    ctx: ProviderContext | undefined,
    listId: string,
    page = 1,
    perPage = 20,
  ): Promise<PublicMetaDBPaginated<PublicMetaDBMediaRef>> {
    const apiKey = this.resolveApiKey(ctx);
    return fetchPublicMetaDBListItems({
      apiKey,
      listId,
      page,
      perPage,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  async listPicks(
    ctx?: ProviderContext,
  ): Promise<PublicMetaDBPaginated<PublicMetaDBPickSummary>> {
    if (this.picksFixture) {
      return { items: this.picksFixture, total: this.picksFixture.length };
    }
    const apiKey = this.resolveApiKey(ctx);
    return fetchPublicMetaDBPicks({
      apiKey,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  async listPickItems(
    ctx: ProviderContext | undefined,
    pickId: string,
    page = 1,
  ): Promise<PublicMetaDBPaginated<PublicMetaDBMediaRef>> {
    const apiKey = this.resolveApiKey(ctx);
    return fetchPublicMetaDBPickItems({
      apiKey,
      pickId,
      page,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  async markWatched(
    ctx: ProviderContext | undefined,
    input: {
      tmdbId: number;
      mediaType: PublicMetaDBMediaType;
      season?: number;
      episode?: number;
    },
  ): Promise<{ success?: boolean }> {
    const apiKey = this.resolveApiKey(ctx);
    return markPublicMetaDBWatched({
      apiKey,
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      season: input.season,
      episode: input.episode,
      fetchImpl: this.fetchImpl,
      signal: ctx?.signal,
      correlationId: ctx?.correlationId,
    });
  }

  /**
   * Lightweight catalog page for Studio preview and native Stremio routes.
   * `providerCatalogId` values: `upnext`, `list.{id}`, `pick.{id}`.
   */
  async getCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'movie' | 'series' | 'anime';
      page?: number;
    },
  ): Promise<PublicMetaDBCatalogItem[]> {
    if (input.mediaType === 'anime') return [];

    const apiKey = this.resolveApiKey(ctx);
    const page = input.page ?? 1;
    let items: PublicMetaDBMediaRef[] = [];

    if (input.providerCatalogId === 'upnext') {
      items = await fetchPublicMetaDBResume({
        apiKey,
        fetchImpl: this.fetchImpl,
        signal: ctx.signal,
        correlationId: ctx.correlationId,
      });
    } else if (input.providerCatalogId.startsWith('list.')) {
      const listId = input.providerCatalogId.slice('list.'.length);
      const data = await fetchPublicMetaDBListItems({
        apiKey,
        listId,
        page,
        perPage: 20,
        fetchImpl: this.fetchImpl,
        signal: ctx.signal,
        correlationId: ctx.correlationId,
      });
      items = data.items ?? [];
    } else if (input.providerCatalogId.startsWith('pick.')) {
      const pickId = input.providerCatalogId.slice('pick.'.length);
      const data = await fetchPublicMetaDBPickItems({
        apiKey,
        pickId,
        page,
        fetchImpl: this.fetchImpl,
        signal: ctx.signal,
        correlationId: ctx.correlationId,
      });
      items = data.items ?? [];
    }

    return items
      .map((item) => ({
        item,
        mediaType: item.media_type === 'movie' ? ('movie' as const) : ('series' as const),
      }))
      .filter(({ mediaType }) => mediaType === input.mediaType)
      .map(({ item, mediaType }) => ({
        publicId: `tmdb:${item.tmdb_id}`,
        mediaType,
        name: `TMDB ${item.tmdb_id}`,
      }));
  }

  private resolveApiKey(ctx?: ProviderContext): string {
    const apiKey = ctx?.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: 'PublicMetaDB API key is missing',
        retryable: false,
      });
    }
    return apiKey;
  }
}

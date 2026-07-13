import {
  normalizeAnimeFormat,
  pickAnimeTitle,
  type AnimeFormat,
} from '@metalayer/anime';
import { classifyHttpStatus, ProviderError } from '../core/errors.js';
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
import type {
  AnimeCatalogItem,
  AnimeMetadataSummary,
  AnimeProviderFetch,
} from '../anime/types.js';

export interface KitsuAdapterOptions {
  baseUrl?: string;
  fetchImpl?: AnimeProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

/**
 * Kitsu JSON:API adapter — thin catalog + metadata for anime.
 */
export class KitsuProviderAdapter implements ProviderAdapter {
  readonly id = 'kitsu';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly fetchImpl: AnimeProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: KitsuAdapterOptions = {}) {
    const definition = getProvider('kitsu');
    if (!definition) throw new Error('Kitsu is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.baseUrl = (options.baseUrl ?? 'https://kitsu.io/api/edge').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    await this.getAnime(ctx, 1);
    return this.getHealth();
  }

  async getCatalogPage(
    ctx: ProviderContext,
    input: {
      providerCatalogId: string;
      mediaType: 'anime';
      page?: number;
    },
  ): Promise<AnimeCatalogItem[]> {
    const page = input.page ?? 1;
    const offset = (page - 1) * 20;
    const sort = resolveKitsuSort(input.providerCatalogId);
    const raw = await this.requestJson<{
      data?: Array<{ id?: string; attributes?: Record<string, unknown> }>;
    }>(
      ctx,
      `/anime?page[limit]=20&page[offset]=${offset}&sort=${encodeURIComponent(sort)}`,
    );
    return (raw.data ?? []).map((item) =>
      mapKitsuCatalogItem(Number(item.id), item.attributes ?? {}),
    );
  }

  async getAnime(ctx: ProviderContext, id: number): Promise<AnimeMetadataSummary> {
    const raw = await this.requestJson<{
      data?: { id?: string; attributes?: Record<string, unknown> };
    }>(ctx, `/anime/${id}`);
    if (!raw.data?.attributes) {
      throw new ProviderError({
        code: 'not_found',
        providerId: this.id,
        message: `Kitsu anime ${id} not found`,
        retryable: false,
      });
    }
    return mapKitsuSummary(Number(raw.data.id ?? id), raw.data.attributes);
  }

  async getExternalIds(
    ctx: ProviderContext,
    id: number,
  ): Promise<{ kitsu: number }> {
    await this.getAnime(ctx, id);
    return { kitsu: id };
  }

  private async requestJson<T>(ctx: ProviderContext, path: string): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
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
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'X-Correlation-Id': ctx.correlationId,
          },
        });
        if (!response.ok) throw classifyHttpStatus(response.status, this.id);
        return (await response.json()) as T;
      },
    });
  }
}

function resolveKitsuSort(catalogId: string): string {
  switch (catalogId) {
    case 'popular':
      return '-userCount';
    case 'top_rated':
      return '-averageRating';
    case 'trending':
    default:
      return '-popularityRank';
  }
}

function mapKitsuCatalogItem(
  id: number,
  attrs: Record<string, unknown>,
): AnimeCatalogItem {
  const poster = attrs.posterImage as { medium?: string } | undefined;
  return {
    id,
    name:
      pickAnimeTitle({
        english: typeof attrs.titles === 'object' && attrs.titles
          ? (attrs.titles as Record<string, string>).en
          : undefined,
        romaji: typeof attrs.canonicalTitle === 'string' ? attrs.canonicalTitle : undefined,
      }) || `kitsu:${id}`,
    mediaType: 'anime',
    format: normalizeAnimeFormat(typeof attrs.subtype === 'string' ? attrs.subtype : undefined),
    posterUrl: poster?.medium ?? null,
    publicId: `kitsu:${id}`,
    externalIds: { kitsu: id },
  };
}

function mapKitsuSummary(
  id: number,
  attrs: Record<string, unknown>,
): AnimeMetadataSummary {
  const titles = (attrs.titles ?? {}) as Record<string, string | undefined>;
  const poster = attrs.posterImage as { medium?: string } | undefined;
  const format: AnimeFormat = normalizeAnimeFormat(
    typeof attrs.subtype === 'string' ? attrs.subtype : undefined,
  );
  const rating =
    typeof attrs.averageRating === 'string'
      ? Number(attrs.averageRating) / 10
      : undefined;
  return {
    id,
    titles: {
      english: titles.en,
      romaji: typeof attrs.canonicalTitle === 'string' ? attrs.canonicalTitle : titles.en_jp,
      native: titles.ja_jp,
    },
    description: typeof attrs.synopsis === 'string' ? attrs.synopsis : undefined,
    format,
    episodes: typeof attrs.episodeCount === 'number' ? attrs.episodeCount : undefined,
    status: typeof attrs.status === 'string' ? attrs.status : undefined,
    posterUrl: poster?.medium ?? null,
    averageScore: Number.isFinite(rating) ? rating : undefined,
    publicId: `kitsu:${id}`,
    externalIds: { kitsu: id },
  };
}

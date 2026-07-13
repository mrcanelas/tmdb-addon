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

export interface JikanAdapterOptions {
  /** Public or self-hosted Jikan base URL (AGENTS.md §17.4). */
  baseUrl?: string;
  fetchImpl?: AnimeProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

/**
 * MyAnimeList metadata via Jikan REST API.
 * Credential-free; rate limits handled by ProviderHttpPolicy.
 */
export class MalJikanProviderAdapter implements ProviderAdapter {
  readonly id = 'mal';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly fetchImpl: AnimeProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: JikanAdapterOptions = {}) {
    const definition = getProvider('mal');
    if (!definition) throw new Error('MAL is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.baseUrl = (
      options.baseUrl ||
      process.env.METALAYER_JIKAN_URL ||
      'https://api.jikan.moe/v4'
    ).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = {
      ...DEFAULT_PROVIDER_HTTP_POLICY,
      maxRetries: 2,
      ...options.policy,
    };
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
    const path = resolveJikanCatalogPath(input.providerCatalogId);
    const raw = await this.requestJson<{
      data?: Array<Record<string, unknown>>;
    }>(ctx, `${path}${path.includes('?') ? '&' : '?'}page=${page}`);

    return (raw.data ?? []).map((item) => mapJikanCatalogItem(item));
  }

  async getAnime(ctx: ProviderContext, id: number): Promise<AnimeMetadataSummary> {
    const raw = await this.requestJson<{ data?: Record<string, unknown> }>(
      ctx,
      `/anime/${id}`,
    );
    if (!raw.data) {
      throw new ProviderError({
        code: 'not_found',
        providerId: this.id,
        message: `MAL anime ${id} not found`,
        retryable: false,
      });
    }
    return mapJikanSummary(raw.data);
  }

  async getExternalIds(
    ctx: ProviderContext,
    id: number,
  ): Promise<{ mal: number }> {
    const anime = await this.getAnime(ctx, id);
    return { mal: anime.id };
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

function resolveJikanCatalogPath(catalogId: string): string {
  switch (catalogId) {
    case 'popular':
      return '/top/anime?filter=bypopularity';
    case 'top_rated':
      return '/top/anime';
    case 'trending':
    default:
      return '/top/anime?filter=airing';
  }
}

function mapJikanCatalogItem(raw: Record<string, unknown>): AnimeCatalogItem {
  const id = Number(raw.mal_id);
  const titles = raw.titles as Array<{ type?: string; title?: string }> | undefined;
  const english = titles?.find((item) => item.type === 'English')?.title;
  const defaultTitle =
    typeof raw.title === 'string'
      ? raw.title
      : titles?.find((item) => item.type === 'Default')?.title;
  const images = raw.images as { jpg?: { image_url?: string } } | undefined;
  return {
    id,
    name: pickAnimeTitle({ english, romaji: defaultTitle }) || `mal:${id}`,
    mediaType: 'anime',
    format: normalizeAnimeFormat(typeof raw.type === 'string' ? raw.type : undefined),
    posterUrl: images?.jpg?.image_url ?? null,
    publicId: `mal:${id}`,
    externalIds: { mal: id },
  };
}

function mapJikanSummary(raw: Record<string, unknown>): AnimeMetadataSummary {
  const id = Number(raw.mal_id);
  const titles = raw.titles as Array<{ type?: string; title?: string }> | undefined;
  const english = titles?.find((item) => item.type === 'English')?.title;
  const defaultTitle =
    typeof raw.title === 'string'
      ? raw.title
      : titles?.find((item) => item.type === 'Default')?.title;
  const japanese = titles?.find((item) => item.type === 'Japanese')?.title;
  const images = raw.images as { jpg?: { image_url?: string } } | undefined;
  const format: AnimeFormat = normalizeAnimeFormat(
    typeof raw.type === 'string' ? raw.type : undefined,
  );
  return {
    id,
    titles: {
      english,
      romaji: defaultTitle,
      native: japanese,
    },
    description: typeof raw.synopsis === 'string' ? raw.synopsis : undefined,
    format,
    episodes: typeof raw.episodes === 'number' ? raw.episodes : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    posterUrl: images?.jpg?.image_url ?? null,
    averageScore: typeof raw.score === 'number' ? raw.score : undefined,
    publicId: `mal:${id}`,
    externalIds: { mal: id },
  };
}

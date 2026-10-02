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
import {
  ANIME_EPISODES_MAX_PAGES,
  type AnimeCatalogItem,
  type AnimeEpisode,
  type AnimeMetadataSummary,
  type AnimeProviderFetch,
} from '../anime/types.js';

export interface AnilistAdapterOptions {
  baseUrl?: string;
  fetchImpl?: AnimeProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

/**
 * AniList GraphQL adapter — independent MetaLayer implementation.
 * Public queries do not require a credential.
 */
export class AnilistProviderAdapter implements ProviderAdapter {
  readonly id = 'anilist';
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly baseUrl: string;
  private readonly fetchImpl: AnimeProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(options: AnilistAdapterOptions = {}) {
    const definition = getProvider('anilist');
    if (!definition) throw new Error('AniList is missing from PROVIDER_REGISTRY');
    this.definition = definition;
    this.baseUrl = (options.baseUrl ?? 'https://graphql.anilist.co').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    await this.getCatalogPage(ctx, {
      providerCatalogId: 'trending',
      mediaType: 'anime',
      page: 1,
    });
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
    const sort = resolveAnilistSort(input.providerCatalogId);
    const data = await this.graphql<{
      Page?: { media?: Array<Record<string, unknown>> };
    }>(
      ctx,
      `query ($page: Int, $sort: [MediaSort]) {
        Page(page: $page, perPage: 20) {
          media(type: ANIME, sort: $sort) {
            id
            idMal
            title { romaji english native }
            coverImage { large }
            format
          }
        }
      }`,
      { page, sort: [sort] },
    );

    return (data.Page?.media ?? []).map((raw) => mapAnilistCatalogItem(raw));
  }

  async searchAnime(
    ctx: ProviderContext,
    query: string,
    page = 1,
  ): Promise<AnimeCatalogItem[]> {
    const data = await this.graphql<{
      Page?: { media?: Array<Record<string, unknown>> };
    }>(
      ctx,
      `query ($page: Int, $search: String) {
        Page(page: $page, perPage: 20) {
          media(type: ANIME, search: $search, sort: [SEARCH_MATCH]) {
            id
            idMal
            title { romaji english native }
            coverImage { large }
            format
          }
        }
      }`,
      { page, search: query },
    );
    return (data.Page?.media ?? []).map((raw) => mapAnilistCatalogItem(raw));
  }

  async getAnime(ctx: ProviderContext, id: number): Promise<AnimeMetadataSummary> {
    const data = await this.graphql<{ Media?: Record<string, unknown> }>(
      ctx,
      `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          format
          episodes
          status
          averageScore
          coverImage { large }
        }
      }`,
      { id },
    );
    if (!data.Media) {
      throw new ProviderError({
        code: 'not_found',
        providerId: this.id,
        message: `AniList anime ${id} not found`,
        retryable: false,
      });
    }
    return mapAnilistSummary(data.Media);
  }

  async getExternalIds(
    ctx: ProviderContext,
    id: number,
  ): Promise<{ anilist: number; mal?: number }> {
    const anime = await this.getAnime(ctx, id);
    return {
      anilist: anime.id,
      mal: anime.externalIds.mal,
    };
  }

  /**
   * Episode list in AniList entry numbering (AGENTS.md §10.11).
   * Combines `streamingEpisodes` (titles / thumbnails) with the paginated
   * `airingSchedule` (dates). Entries without either still yield numbered
   * placeholders when `episodes` is known, so Stremio can list them.
   */
  async getEpisodes(ctx: ProviderContext, id: number): Promise<AnimeEpisode[]> {
    const byNumber = new Map<number, AnimeEpisode>();
    let declared: number | undefined;

    for (let page = 1; page <= ANIME_EPISODES_MAX_PAGES; page += 1) {
      const data = await this.graphql<{
        Media?: {
          episodes?: number | null;
          streamingEpisodes?: Array<{ title?: string; thumbnail?: string }> | null;
          airingSchedule?: {
            pageInfo?: { hasNextPage?: boolean };
            nodes?: Array<{ episode?: number; airingAt?: number }>;
          } | null;
        } | null;
      }>(
        ctx,
        `query ($id: Int, $page: Int) {
          Media(id: $id, type: ANIME) {
            episodes
            ${page === 1 ? 'streamingEpisodes { title thumbnail }' : ''}
            airingSchedule(page: $page, perPage: 50) {
              pageInfo { hasNextPage }
              nodes { episode airingAt }
            }
          }
        }`,
        { id, page },
      );
      if (!data.Media) {
        throw new ProviderError({
          code: 'not_found',
          providerId: this.id,
          message: `AniList anime ${id} not found`,
          retryable: false,
        });
      }
      if (typeof data.Media.episodes === 'number') declared = data.Media.episodes;

      for (const [index, item] of (data.Media.streamingEpisodes ?? []).entries()) {
        const number = parseStreamingEpisodeNumber(item.title) ?? index + 1;
        const current = byNumber.get(number) ?? { number };
        byNumber.set(number, {
          ...current,
          title: cleanStreamingTitle(item.title) ?? current.title,
          thumbnailUrl: item.thumbnail ?? current.thumbnailUrl,
        });
      }
      for (const node of data.Media.airingSchedule?.nodes ?? []) {
        if (typeof node.episode !== 'number' || node.episode < 1) continue;
        const current = byNumber.get(node.episode) ?? { number: node.episode };
        byNumber.set(node.episode, {
          ...current,
          airDate:
            typeof node.airingAt === 'number'
              ? new Date(node.airingAt * 1000).toISOString()
              : current.airDate,
        });
      }
      if (!data.Media.airingSchedule?.pageInfo?.hasNextPage) break;
    }

    if (declared && declared > 0) {
      for (let number = 1; number <= declared; number += 1) {
        if (!byNumber.has(number)) byNumber.set(number, { number });
      }
    }

    return [...byNumber.values()].sort((a, b) => a.number - b.number);
  }

  private async graphql<T>(
    ctx: ProviderContext,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    return withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(this.baseUrl, {
          method: 'POST',
          signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Correlation-Id': ctx.correlationId,
          },
          body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) throw classifyHttpStatus(response.status, this.id);
        const payload = (await response.json()) as {
          data?: T;
          errors?: Array<{ message?: string }>;
        };
        if (payload.errors?.length) {
          throw new ProviderError({
            code: 'upstream',
            providerId: this.id,
            message: payload.errors[0]?.message || 'AniList GraphQL error',
            retryable: true,
          });
        }
        return payload.data as T;
      },
    });
  }
}

/** AniList streaming titles look like "Episode 12 - Title"; recover the number. */
function parseStreamingEpisodeNumber(title: string | undefined): number | undefined {
  if (!title) return undefined;
  const match = /^\s*episode\s+(\d+)/i.exec(title);
  return match ? Number(match[1]) : undefined;
}

function cleanStreamingTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const cleaned = title.replace(/^\s*episode\s+\d+\s*[-–:]\s*/i, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function resolveAnilistSort(catalogId: string): string {
  switch (catalogId) {
    case 'popular':
      return 'POPULARITY_DESC';
    case 'top_rated':
      return 'SCORE_DESC';
    case 'trending':
    default:
      return 'TRENDING_DESC';
  }
}

function mapAnilistCatalogItem(raw: Record<string, unknown>): AnimeCatalogItem {
  const id = Number(raw.id);
  const title = (raw.title ?? {}) as Record<string, string | undefined>;
  const cover = (raw.coverImage ?? {}) as Record<string, string | undefined>;
  const name =
    pickAnimeTitle({
      english: title.english,
      romaji: title.romaji,
      native: title.native,
    }) || `anilist:${id}`;
  return {
    id,
    name,
    mediaType: 'anime',
    format: normalizeAnimeFormat(typeof raw.format === 'string' ? raw.format : undefined),
    posterUrl: cover.large ?? null,
    publicId: `anilist:${id}`,
    externalIds: {
      anilist: id,
      mal: typeof raw.idMal === 'number' ? raw.idMal : undefined,
    },
  };
}

function mapAnilistSummary(raw: Record<string, unknown>): AnimeMetadataSummary {
  const id = Number(raw.id);
  const title = (raw.title ?? {}) as Record<string, string | undefined>;
  const cover = (raw.coverImage ?? {}) as Record<string, string | undefined>;
  const format: AnimeFormat = normalizeAnimeFormat(
    typeof raw.format === 'string' ? raw.format : undefined,
  );
  return {
    id,
    titles: {
      english: title.english,
      romaji: title.romaji,
      native: title.native,
    },
    description: typeof raw.description === 'string' ? raw.description : undefined,
    format,
    episodes: typeof raw.episodes === 'number' ? raw.episodes : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    posterUrl: cover.large ?? null,
    averageScore: typeof raw.averageScore === 'number' ? raw.averageScore / 10 : undefined,
    publicId: `anilist:${id}`,
    externalIds: {
      anilist: id,
      mal: typeof raw.idMal === 'number' ? raw.idMal : undefined,
    },
  };
}

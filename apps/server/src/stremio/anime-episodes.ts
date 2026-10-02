import {
  FRIBB_FIXTURE,
  buildAnimeVideos,
  findFribbRow,
  loadFribbMappings,
  type AnimeVideo,
  type AnimeVideoOrderType,
  type FribbAnimeMappingRow,
  type FribbLookupProvider,
} from '@metalayer/anime';
import type { CacheStore } from '@metalayer/cache';
import type { EpisodeOrderType, MetaLayerConfig } from '@metalayer/config';
import {
  applyEpisodeCorrectionsToVideos,
  type MetadataCorrection,
} from '@metalayer/corrections';
import { buildCourEdges, buildEpisodeEdges, type IdentityEdge } from '@metalayer/identity-graph';
import {
  compileResolutionPlan,
  type FieldResolutionAttempt,
} from '@metalayer/metadata-resolver';
import {
  AnilistProviderAdapter,
  KitsuProviderAdapter,
  MalJikanProviderAdapter,
  ProviderError,
  type AnimeEpisode,
  type AnimeMetadataSummary,
  type ProviderContext,
} from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';
import type { StremioAppContext } from './catalog-meta.js';

export type AnimeIdentityProvider = 'anilist' | 'mal' | 'kitsu';

export interface AnimeEpisodeOrderResult {
  videos: AnimeVideo[];
  /** Full attempt history for Meta Inspector (AGENTS.md §11). */
  attempts: FieldResolutionAttempt[];
  selectedProvider: string | null;
  orderType: EpisodeOrderType | null;
  fallbackUsed: boolean;
  effectivePlanHash: string;
  /** Cross-provider identity used for Stremio ids (from Fribb / provider cross-ids). */
  identity: {
    imdb?: string;
    tmdb?: number;
    seasonNumber?: number;
    source: 'fribb-live' | 'fribb-fixture' | 'provider' | 'none';
  };
  edges: IdentityEdge[];
  warnings: Array<{ code: string; params?: Record<string, string | number> }>;
}

const FRIBB_CACHE_KEY = 'anime:fribb:rows:v1';
const FRIBB_TTL_MS = 24 * 60 * 60 * 1000;
const EPISODES_TTL_MS = 6 * 60 * 60 * 1000;

const ANIME_EPISODE_PROVIDERS = new Set<AnimeIdentityProvider>(['anilist', 'mal', 'kitsu']);

function isAnimeEpisodeProvider(provider: string): provider is AnimeIdentityProvider {
  return ANIME_EPISODE_PROVIDERS.has(provider as AnimeIdentityProvider);
}

/**
 * Fribb rows: live dataset when `METALAYER_FRIBB_URL` (or the default URL)
 * is enabled through `METALAYER_FRIBB_LIVE=true`; otherwise the CI fixture.
 * Live failures fall back to the fixture and are reported as warnings.
 */
export async function loadFribbRows(
  app: Pick<StremioAppContext, 'providerFetch' | 'providerCache'>,
  options: { signal?: AbortSignal } = {},
): Promise<{ rows: FribbAnimeMappingRow[]; source: 'fribb-live' | 'fribb-fixture'; warning?: string }> {
  const live = process.env.METALAYER_FRIBB_LIVE === 'true';
  if (!live) return { rows: FRIBB_FIXTURE, source: 'fribb-fixture' };

  const cached = await app.providerCache.get<FribbAnimeMappingRow[]>(FRIBB_CACHE_KEY);
  if (cached && cached.status !== 'stale') {
    return { rows: cached.entry.value, source: 'fribb-live' };
  }
  try {
    const rows = await loadFribbMappings({
      url: process.env.METALAYER_FRIBB_URL,
      fetchImpl: app.providerFetch as ((input: string, init?: RequestInit) => Promise<Response>) | undefined,
      signal: options.signal,
    });
    await app.providerCache.set(FRIBB_CACHE_KEY, rows, {
      ttlMs: FRIBB_TTL_MS,
      source: 'fribb',
      staleEligible: true,
    });
    return { rows, source: 'fribb-live' };
  } catch (error) {
    if (cached) return { rows: cached.entry.value, source: 'fribb-live', warning: 'FRIBB_STALE' };
    const code = error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : 'UPSTREAM';
    return { rows: FRIBB_FIXTURE, source: 'fribb-fixture', warning: `FRIBB_${code}` };
  }
}

function mergeIdsFromRow(row: FribbAnimeMappingRow | undefined) {
  return {
    anilist: row?.anilistId,
    mal: row?.malId,
    kitsu: row?.kitsuId,
    tmdb: row?.tmdbId,
    imdb: row?.imdbId,
    seasonNumber: row?.tmdbSeason,
  };
}

async function fetchEpisodes(
  app: StremioAppContext,
  provider: AnimeIdentityProvider,
  id: number,
  ctx: ProviderContext,
): Promise<AnimeEpisode[]> {
  const cacheKey = `anime:episodes:${provider}:${id}`;
  const cached = await app.providerCache.get<AnimeEpisode[]>(cacheKey);
  if (cached && cached.status === 'hit') return cached.entry.value;

  const adapter = createAppProviderAdapter(app, provider, {
    jikanBaseUrl: process.env.METALAYER_JIKAN_URL,
  });
  let episodes: AnimeEpisode[];
  if (adapter instanceof AnilistProviderAdapter) {
    episodes = await adapter.getEpisodes(ctx, id);
  } else if (adapter instanceof MalJikanProviderAdapter) {
    episodes = await adapter.getEpisodes(ctx, id);
  } else if (adapter instanceof KitsuProviderAdapter) {
    episodes = await adapter.getEpisodes(ctx, id);
  } else {
    throw new ProviderError({
      code: 'unsupported',
      providerId: provider,
      message: `${provider} has no episode adapter`,
      retryable: false,
    });
  }
  if (episodes.length > 0) {
    await app.providerCache.set(cacheKey, episodes, {
      ttlMs: EPISODES_TTL_MS,
      source: provider,
      staleEligible: true,
    });
  } else if (cached) {
    return cached.entry.value;
  }
  return episodes;
}

export const ANIME_PUBLIC_ID = /^(anilist|mal|kitsu):(\d+)$/i;

export function parseAnimePublicId(
  publicId: string,
): { provider: AnimeIdentityProvider; id: number } | null {
  const match = ANIME_PUBLIC_ID.exec(publicId);
  if (!match) return null;
  return { provider: match[1]!.toLowerCase() as AnimeIdentityProvider, id: Number(match[2]) };
}

/** Load the anime summary for a public id through the matching adapter. */
export async function loadAnimeSummary(
  app: StremioAppContext,
  publicId: string,
  ctx: ProviderContext,
): Promise<{ provider: AnimeIdentityProvider; id: number; anime: AnimeMetadataSummary } | null> {
  const parsed = parseAnimePublicId(publicId);
  if (!parsed) return null;
  const adapter = createAppProviderAdapter(app, parsed.provider, {
    jikanBaseUrl: process.env.METALAYER_JIKAN_URL,
  });
  if (
    !(adapter instanceof AnilistProviderAdapter) &&
    !(adapter instanceof MalJikanProviderAdapter) &&
    !(adapter instanceof KitsuProviderAdapter)
  ) {
    return null;
  }
  const anime = await adapter.getAnime(ctx, parsed.id);
  return { ...parsed, anime };
}

/**
 * Resolve anime `videos[]` by walking the effective `episodeOrder` chain
 * (AGENTS.md §10.11). Each step is one provider × order type; the first
 * provider that returns episodes wins and is reported with full attempts.
 */
export async function resolveAnimeEpisodeOrder(
  app: StremioAppContext,
  config: MetaLayerConfig,
  input: {
    provider: AnimeIdentityProvider;
    id: number;
    anime: AnimeMetadataSummary;
    ctx: ProviderContext;
    corrections?: MetadataCorrection[];
  },
): Promise<AnimeEpisodeOrderResult> {
  const warnings: AnimeEpisodeOrderResult['warnings'] = [];
  const plan = compileResolutionPlan({
    field: 'episodeOrder',
    mediaType: 'anime',
    resolution: config.resolution,
    fieldProviders: config.fieldProviders,
    metadataLocale: config.localization.metadataLocale,
    fallbackLocales: config.localization.metadataFallbackLocales,
  });

  // Identity: provider cross-ids first, then Fribb rows (live or fixture).
  const fribb = await loadFribbRows(app, { signal: input.ctx.signal });
  if (fribb.warning) warnings.push({ code: fribb.warning });
  const row =
    findFribbRow(fribb.rows, input.provider as FribbLookupProvider, input.id) ??
    (input.anime.externalIds.mal
      ? findFribbRow(fribb.rows, 'mal', input.anime.externalIds.mal)
      : undefined) ??
    (input.anime.externalIds.anilist
      ? findFribbRow(fribb.rows, 'anilist', input.anime.externalIds.anilist)
      : undefined);
  const ids = mergeIdsFromRow(row);
  const knownIds: Record<AnimeIdentityProvider, number | undefined> = {
    anilist: input.anime.externalIds.anilist ?? ids.anilist,
    mal: input.anime.externalIds.mal ?? ids.mal,
    kitsu: input.anime.externalIds.kitsu ?? ids.kitsu,
  };
  knownIds[input.provider] = input.id;

  const idPrefix = ids.imdb
    ? ids.imdb
    : ids.tmdb
      ? `tmdb:${ids.tmdb}`
      : `${input.provider}:${input.id}`;
  const identitySource: AnimeEpisodeOrderResult['identity']['source'] = row
    ? fribb.source
    : 'none';

  const attempts: FieldResolutionAttempt[] = [];
  let videos: AnimeVideo[] = [];
  let selectedProvider: string | null = null;
  let orderType: EpisodeOrderType | null = null;
  const episodesByProvider = new Map<string, AnimeEpisode[] | 'error' | 'unsupported'>();

  for (const [index, step] of plan.generatedSteps.entries()) {
    const stepOrder = step.orderType ?? 'provider-default';
    const base: FieldResolutionAttempt = {
      index,
      stepId: step.id,
      provider: step.provider,
      localePreference: step.locale,
      status: 'skipped',
    };

    if (!isAnimeEpisodeProvider(step.provider)) {
      // TMDB/TVDB episode structures for anime are served through the series
      // route once identity is known; here they cannot supply anime entries.
      attempts.push({ ...base, reason: 'PROVIDER_UNSUPPORTED_FOR_MEDIA_TYPE', reasonParams: { mediaType: 'anime' } });
      continue;
    }
    const providerId = knownIds[step.provider];
    if (!providerId) {
      attempts.push({ ...base, reason: 'IDENTITY_UNKNOWN', reasonParams: { provider: step.provider } });
      continue;
    }
    if (stepOrder === 'dvd' || stepOrder === 'production') {
      attempts.push({ ...base, reason: 'ORDER_TYPE_UNSUPPORTED', reasonParams: { orderType: stepOrder } });
      continue;
    }

    let episodes = episodesByProvider.get(step.provider);
    if (episodes === undefined) {
      try {
        episodes = await fetchEpisodes(app, step.provider, providerId, input.ctx);
      } catch (error) {
        episodes = error instanceof ProviderError && error.code === 'unsupported' ? 'unsupported' : 'error';
      }
      episodesByProvider.set(step.provider, episodes);
    }
    if (episodes === 'unsupported') {
      attempts.push({ ...base, reason: 'PROVIDER_UNSUPPORTED', reasonParams: { provider: step.provider } });
      continue;
    }
    if (episodes === 'error') {
      attempts.push({ ...base, status: 'not-found', reason: 'PROVIDER_ERROR', reasonParams: { provider: step.provider } });
      continue;
    }
    if (episodes.length === 0) {
      attempts.push({ ...base, status: 'empty', reason: 'NO_EPISODES' });
      continue;
    }

    const effectiveOrder: AnimeVideoOrderType =
      stepOrder === 'community-corrected' ? 'absolute' : stepOrder;
    videos = buildAnimeVideos(episodes, {
      orderType: effectiveOrder,
      idPrefix,
      seasonNumber: ids.seasonNumber,
    });
    selectedProvider = step.provider;
    orderType = stepOrder;
    attempts.push({
      ...base,
      status: 'selected',
      confidence: row ? 0.9 : 0.7,
      reason: 'EPISODES_FOUND',
      reasonParams: { count: episodes.length, orderType: stepOrder },
    });
    break;
  }

  if (input.corrections && input.corrections.length > 0 && videos.length > 0) {
    videos = applyEpisodeCorrectionsToVideos(videos, input.corrections, {
      imdbId: ids.imdb,
      tmdbId: ids.tmdb,
    }) as AnimeVideo[];
  }

  const edges: IdentityEdge[] = [];
  if (row && (ids.tmdb || ids.imdb)) {
    const series = ids.imdb
      ? { provider: 'imdb' as const, id: ids.imdb }
      : { provider: 'tmdb' as const, id: String(ids.tmdb) };
    const mapping = {
      entry: { provider: input.provider, id: String(input.id) },
      series,
      seasonNumber: ids.seasonNumber ?? 1,
      source: fribb.source,
      confidence: ids.seasonNumber ? 0.85 : 0.6,
    };
    edges.push(...buildCourEdges(mapping));
    if (videos.length > 0) {
      edges.push(
        ...buildEpisodeEdges({
          ...mapping,
          episodes: videos.map((video) => video.episode).slice(0, 40),
        }),
      );
    }
  }

  if (selectedProvider === null) {
    warnings.push({ code: 'EPISODES_UNRESOLVED' });
  }

  return {
    videos,
    attempts,
    selectedProvider,
    orderType,
    fallbackUsed: selectedProvider !== null && attempts.findIndex((a) => a.status === 'selected') > 0,
    effectivePlanHash: plan.effectivePlanHash,
    identity: {
      imdb: ids.imdb,
      tmdb: ids.tmdb,
      seasonNumber: ids.seasonNumber,
      source: identitySource,
    },
    edges,
    warnings,
  };
}

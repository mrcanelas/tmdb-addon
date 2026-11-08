import type { CatalogMetaPreview } from '@metalayer/catalogs';
import type { MetaLayerConfig } from '@metalayer/config';
import {
  AnilistProviderAdapter,
  KitsuProviderAdapter,
  MalJikanProviderAdapter,
  ProviderError,
  TmdbProviderAdapter,
} from '@metalayer/providers';
import type { SearchHit } from '@metalayer/search-ai';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';
import { applySearchPolicy, type CatalogWarning } from './catalog-policy.js';
import {
  tmdbImageUrl,
  type SecretResolver,
  type StremioAppContext,
} from './catalog-meta.js';
import { tmdbCatalogItemToMetaPreview } from './tmdb-catalog-meta.js';

export type SearchMediaType = 'movie' | 'series' | 'anime';

/** Manifest catalog id for native text search; one per media type. */
export const SEARCH_CATALOG_ID = 'metalayer.search';

export const SEARCH_PAGE_SIZE = 20;

/**
 * Minimal server-side localization for the search catalog label; the UI owns
 * full i18n, but the Stremio manifest needs one string per install locale.
 */
const SEARCH_CATALOG_NAMES: Record<string, Record<SearchMediaType, string>> = {
  en: { movie: 'Search movies', series: 'Search series', anime: 'Search anime' },
  pt: { movie: 'Buscar filmes', series: 'Buscar séries', anime: 'Buscar animes' },
  es: { movie: 'Buscar películas', series: 'Buscar series', anime: 'Buscar anime' },
};

export function searchCatalogName(mediaType: SearchMediaType, locale?: string): string {
  const base = (locale ?? 'en').split('-')[0]?.toLowerCase() ?? 'en';
  return (SEARCH_CATALOG_NAMES[base] ?? SEARCH_CATALOG_NAMES.en)[mediaType];
}

export function isSearchCatalogId(catalogId: string): boolean {
  return catalogId === SEARCH_CATALOG_ID;
}

/** Media types that should expose a search catalog for this configuration. */
export function searchMediaTypesFor(config: MetaLayerConfig): SearchMediaType[] {
  if (config.search?.enabled === false) return [];
  const types: SearchMediaType[] = ['movie', 'series'];
  if (config.catalogs.some((catalog) => catalog.enabled && catalog.mediaType === 'anime')) {
    types.push('anime');
  }
  return types;
}

export interface SearchInput {
  query: string;
  mediaType: SearchMediaType;
  skip?: number;
  correlationId: string;
  getSecret: SecretResolver;
  /** Restrict anime search to these providers (defaults to anime catalogs' providers or AniList). */
  animeProviders?: Array<'anilist' | 'mal' | 'kitsu'>;
}

export interface SearchResult {
  metas: CatalogMetaPreview[];
  hits: SearchHit[];
  providers: string[];
  warnings: CatalogWarning[];
}

function metaToHit(meta: CatalogMetaPreview, index: number): SearchHit {
  const externalIds: Record<string, string | number> = {};
  if (/^tt\d+$/.test(meta.id)) externalIds.imdb = meta.id;
  const tmdbMatch = /^tmdb:(\d+)$/.exec(meta.id);
  if (tmdbMatch) externalIds.tmdb = Number(tmdbMatch[1]);
  const animeMatch = /^(anilist|mal|kitsu):(\d+)$/.exec(meta.id);
  if (animeMatch) externalIds[animeMatch[1]] = Number(animeMatch[2]);
  return {
    id: meta.id,
    title: meta.name,
    mediaType: meta.type,
    year: meta.year,
    provider: meta.provider ?? 'tmdb',
    externalIds,
    // Relevance decays with provider rank; keeps provider order stable in combined views.
    score: Math.max(0, 1 - index * 0.01),
  };
}

/**
 * Live text search for one media type. Applies only search-scoped rules
 * (AGENTS.md §13.8) and never re-sorts provider relevance.
 */
export async function searchStremio(
  app: StremioAppContext,
  config: MetaLayerConfig,
  input: SearchInput,
): Promise<SearchResult> {
  const locale = config.localization.metadataLocale || 'en-US';
  const region = config.localization.availabilityRegion || config.localization.contentRegion;
  const warnings: CatalogWarning[] = [];
  const providers: string[] = [];
  const skip = Math.max(0, input.skip ?? 0);
  const page = Math.floor(skip / SEARCH_PAGE_SIZE) + 1;
  const ctxBase = { correlationId: input.correlationId, locale, region };

  let metas: CatalogMetaPreview[] = [];

  if (input.mediaType === 'anime') {
    const configured = input.animeProviders ?? animeProvidersFromCatalogs(config);
    for (const providerId of configured) {
      const adapter = createAppProviderAdapter(app, providerId, {
        cache: app.providerCache,
        jikanBaseUrl: process.env.METALAYER_JIKAN_URL,
      });
      if (
        !(adapter instanceof AnilistProviderAdapter) &&
        !(adapter instanceof MalJikanProviderAdapter) &&
        !(adapter instanceof KitsuProviderAdapter)
      ) {
        warnings.push({ code: 'CATALOG_PROVIDER_UNAVAILABLE', params: { provider: providerId } });
        continue;
      }
      providers.push(providerId);
      try {
        const items = await adapter.searchAnime(ctxBase, input.query, page);
        metas.push(
          ...items.map(
            (item): CatalogMetaPreview => ({
              id: item.publicId,
              type: item.format === 'movie' ? 'movie' : 'anime',
              name: item.name,
              poster: item.posterUrl ?? undefined,
              provider: providerId,
              hasArtwork: Boolean(item.posterUrl),
            }),
          ),
        );
      } catch (error) {
        warnings.push({
          code: 'SEARCH_PROVIDER_FAILED',
          params: { provider: providerId, reason: error instanceof ProviderError ? error.code : 'error' },
        });
      }
    }
  } else {
    const apiKey =
      (await input.getSecret('tmdb')) ||
      process.env.METALAYER_TMDB_API_KEY ||
      process.env.TMDB_API;
    if (!apiKey) {
      warnings.push({ code: 'SOURCE_CREDENTIAL_MISSING', params: { provider: 'tmdb' } });
    } else {
      const adapter = createAppProviderAdapter(app, 'tmdb', {
        apiKey,
        cache: app.providerCache,
        stremioPublicId: config.identity?.stremioPublicId || 'imdb',
      });
      if (!(adapter instanceof TmdbProviderAdapter)) {
        warnings.push({ code: 'CATALOG_PROVIDER_UNAVAILABLE', params: { provider: 'tmdb' } });
      } else {
        providers.push('tmdb');
        try {
          const result = await adapter.searchCatalogItems(
            { ...ctxBase, apiKey },
            { query: input.query, mediaType: input.mediaType, page },
          );
          metas = result.items.map((item) =>
            tmdbCatalogItemToMetaPreview(item, tmdbImageUrl(item.posterPath, 'w342')),
          );
        } catch (error) {
          warnings.push({
            code: 'SEARCH_PROVIDER_FAILED',
            params: { provider: 'tmdb', reason: error instanceof ProviderError ? error.code : 'error' },
          });
        }
      }
    }
  }

  const seen = new Set<string>();
  metas = metas.filter((meta) => {
    const key = `${meta.type}:${meta.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const filtered = applySearchPolicy(metas, config, `search:${input.mediaType}:${input.query.toLowerCase()}`);
  warnings.push(...filtered.warnings);

  return {
    metas: filtered.metas,
    hits: filtered.metas.map(metaToHit),
    providers,
    warnings: [...new Map(warnings.map((w) => [JSON.stringify(w), w])).values()],
  };
}

function animeProvidersFromCatalogs(
  config: MetaLayerConfig,
): Array<'anilist' | 'mal' | 'kitsu'> {
  const ids = new Set<'anilist' | 'mal' | 'kitsu'>();
  for (const catalog of config.catalogs) {
    if (!catalog.enabled || catalog.mediaType !== 'anime') continue;
    if (catalog.provider === 'anilist' || catalog.provider === 'mal' || catalog.provider === 'kitsu') {
      ids.add(catalog.provider);
    }
  }
  return ids.size > 0 ? [...ids] : ['anilist'];
}

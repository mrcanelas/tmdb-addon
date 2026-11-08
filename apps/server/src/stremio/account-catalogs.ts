import type { CatalogMetaPreview } from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig } from '@metalayer/config';
import {
  AnilistTrackingAdapter,
  MalTrackingAdapter,
  MdblistAdapter,
  ProviderError,
  SimklTrackingAdapter,
  TmdbProviderAdapter,
  TraktTrackingAdapter,
  type ListCatalogItem,
  type ListCatalogPage,
} from '@metalayer/providers';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';
import type { CatalogWarning } from './catalog-policy.js';
import type { SecretResolver, StremioAppContext } from './catalog-meta.js';
import { tmdbCatalogItemToMetaPreview, yearFromReleaseInfo } from './tmdb-catalog-meta.js';

export const STATIC_PAGE_SIZE = 20;

/** Providers whose catalogs come from a connected account or user API key (AGENTS.md §20). */
const ACCOUNT_PROVIDERS = new Set(['trakt', 'simkl', 'mdblist']);

/** `anilist` / `mal` double as metadata providers; only `user.*` ids hit the account APIs. */
export function isAccountCatalogProvider(provider: string, providerCatalogId: string): boolean {
  if (ACCOUNT_PROVIDERS.has(provider)) return true;
  return (provider === 'anilist' || provider === 'mal') && providerCatalogId.startsWith('user.');
}

export interface AccountCatalogPageResult {
  metas: CatalogMetaPreview[];
  hasMore: boolean;
  warnings: CatalogWarning[];
}

/** Materialized catalogs (AI Ranked List / static imports) — served in stored order. */
export function loadStaticCatalogPage(
  catalog: CatalogDefinition,
  page: number,
): { metas: CatalogMetaPreview[]; hasMore: boolean } {
  const items = catalog.staticItems ?? [];
  const start = Math.max(0, page - 1) * STATIC_PAGE_SIZE;
  const slice = items.slice(start, start + STATIC_PAGE_SIZE);
  return {
    metas: slice.map((item, index) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      poster: item.poster,
      year: item.year,
      releaseInfo: item.year !== undefined ? String(item.year) : undefined,
      provider: catalog.provider,
      hasArtwork: Boolean(item.poster),
      facts: { listPosition: start + index + 1 },
    })),
    hasMore: start + STATIC_PAGE_SIZE < items.length,
  };
}

export function listItemToMetaPreview(
  item: ListCatalogItem,
  provider: string,
): CatalogMetaPreview {
  return {
    id: item.publicId,
    type: item.mediaType,
    name: item.name,
    poster: item.posterUrl ?? undefined,
    releaseInfo: item.year !== undefined ? String(item.year) : undefined,
    year: item.year,
    rating: item.rating,
    provider,
    hasArtwork: Boolean(item.posterUrl),
    facts: {
      rating: item.rating,
      listPosition: item.position,
    },
  };
}

type Ctx = { correlationId: string; locale?: string; region?: string; apiKey?: string };

/**
 * Loads one page of an account/list catalog. Credential gaps are reported as
 * `SOURCE_CREDENTIAL_MISSING` warnings, never as fake media cards (AGENTS.md §13.9).
 */
export async function loadAccountCatalogPage(
  app: StremioAppContext,
  config: MetaLayerConfig,
  source: CatalogDefinition,
  page: number,
  ctx: Ctx,
  getSecret: SecretResolver,
): Promise<AccountCatalogPageResult> {
  const warnings: CatalogWarning[] = [];
  const missing = (provider: string): AccountCatalogPageResult => ({
    metas: [],
    hasMore: false,
    warnings: [{ code: 'SOURCE_CREDENTIAL_MISSING', params: { provider } }],
  });
  const fromPage = (result: ListCatalogPage, provider: string): AccountCatalogPageResult => ({
    metas: result.items.map((item) => listItemToMetaPreview(item, provider)),
    hasMore: result.hasMore,
    warnings,
  });

  try {
    switch (source.provider) {
      case 'trakt': {
        const token = await getSecret('trakt', 'oauth_access');
        const needsAuth = !/^(trending|popular)$/.test(source.providerCatalogId);
        if (needsAuth && !token) return missing('trakt');
        const adapter = createAppProviderAdapter(app, 'trakt', {
          accessToken: token ?? undefined,
        });
        if (!(adapter instanceof TraktTrackingAdapter)) return missing('trakt');
        return fromPage(
          await adapter.getCatalogPage(ctx, {
            providerCatalogId: source.providerCatalogId,
            mediaType: source.mediaType,
            page,
          }),
          'trakt',
        );
      }
      case 'mdblist': {
        const apiKey = await getSecret('mdblist');
        if (!apiKey) return missing('mdblist');
        const adapter = createAppProviderAdapter(app, 'mdblist', { apiKey });
        if (!(adapter instanceof MdblistAdapter)) return missing('mdblist');
        return fromPage(
          await adapter.getCatalogPage(
            { ...ctx, apiKey },
            {
              providerCatalogId: source.providerCatalogId,
              mediaType: source.mediaType,
              page,
            },
          ),
          'mdblist',
        );
      }
      case 'simkl': {
        const token = await getSecret('simkl', 'oauth_access');
        if (!token) return missing('simkl');
        const adapter = createAppProviderAdapter(app, 'simkl', { accessToken: token });
        if (!(adapter instanceof SimklTrackingAdapter)) return missing('simkl');
        return fromPage(
          await adapter.getCatalogPage(ctx, {
            providerCatalogId: source.providerCatalogId,
            mediaType: source.mediaType,
            page,
          }),
          'simkl',
        );
      }
      case 'anilist': {
        const token = await getSecret('anilist', 'oauth_access');
        if (!token) return missing('anilist');
        const adapter = createAppProviderAdapter(app, 'anilist', { accessToken: token });
        if (!(adapter instanceof AnilistTrackingAdapter)) return missing('anilist');
        return fromPage(
          await adapter.getCatalogPage(ctx, {
            providerCatalogId: source.providerCatalogId,
            mediaType: 'anime',
            page,
          }),
          'anilist',
        );
      }
      case 'mal': {
        const token = await getSecret('mal', 'oauth_access');
        if (!token) return missing('mal');
        const adapter = createAppProviderAdapter(app, 'mal', { accessToken: token });
        if (!(adapter instanceof MalTrackingAdapter)) return missing('mal');
        return fromPage(
          await adapter.getCatalogPage(ctx, {
            providerCatalogId: source.providerCatalogId,
            mediaType: 'anime',
            page,
          }),
          'mal',
        );
      }
      case 'tmdb': {
        const sessionId = await getSecret('tmdb_session');
        if (!sessionId || !ctx.apiKey) return missing('tmdb_session');
        const adapter = createAppProviderAdapter(app, 'tmdb', {
          apiKey: ctx.apiKey,
          stremioPublicId: config.identity?.stremioPublicId || 'imdb',
        });
        if (!(adapter instanceof TmdbProviderAdapter)) return missing('tmdb');
        const detailed = await adapter.getAccountCatalogPage(ctx, {
          providerCatalogId: source.providerCatalogId,
          mediaType: source.mediaType,
          page,
          sessionId,
        });
        return {
          metas: detailed.items.map((item) => {
            const preview = tmdbCatalogItemToMetaPreview(
              item,
              item.posterPath ? `https://image.tmdb.org/t/p/w342${item.posterPath}` : undefined,
            );
            return { ...preview, year: preview.year ?? yearFromReleaseInfo(item.releaseDate) };
          }),
          hasMore: detailed.page < detailed.totalPages,
          warnings,
        };
      }
      default:
        return {
          metas: [],
          hasMore: false,
          warnings: [{ code: 'CATALOG_PROVIDER_UNAVAILABLE', params: { provider: source.provider } }],
        };
    }
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'auth') {
      return {
        metas: [],
        hasMore: false,
        warnings: [
          { code: 'SOURCE_CREDENTIAL_INVALID', params: { provider: source.provider } },
        ],
      };
    }
    if (error instanceof ProviderError && error.code === 'unsupported') {
      return {
        metas: [],
        hasMore: false,
        warnings: [
          {
            code: 'CATALOG_PROVIDER_UNAVAILABLE',
            params: { provider: source.provider, catalog: source.providerCatalogId },
          },
        ],
      };
    }
    throw error;
  }
}

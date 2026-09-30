import { parseResolutionConfig, ResolvableFieldSchema, type MetaLayerConfig } from '@metalayer/config';
import { compileResolutionPlan, type ProviderFieldBag } from '@metalayer/metadata-resolver';
import { ProviderError, TmdbProviderAdapter, ImdbProviderAdapter, FanartArtworkAdapter, RpdbArtworkAdapter, type ProviderHealthRegistry, type TmdbFetch } from '@metalayer/providers';
import type { CacheStore } from '@metalayer/cache';
import { createAppProviderAdapter } from '../create-app-provider-adapter.js';

function tmdbImageUrl(path: string | null | undefined, size: 'w500' | 'w1280'): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function pickAssetUrl(
  assets: Array<{ kind: string; url: string }>,
  kind: string,
): string | null {
  return assets.find((asset) => asset.kind === kind)?.url ?? null;
}

export async function gatherLiveBag(
  app: {
    providerFetch?: TmdbFetch;
    providerHealth: ProviderHealthRegistry;
    providerCache: CacheStore;
  },
  config: MetaLayerConfig,
  input: {
    id: string;
    mediaType: 'movie' | 'series' | 'anime';
    apiKey?: string;
    getSecret: (provider: string) => Promise<string | null | undefined>;
    correlationId: string;
  },
): Promise<{ bag: ProviderFieldBag; publicId?: string; originalLanguage?: string }> {
  const locale = config.localization.metadataLocale;
  const requestedLocales = new Set(config.localization.metadataFallbackLocales);
  const resolution = config.resolution ? parseResolutionConfig(config.resolution) : undefined;
  for (const field of ResolvableFieldSchema.options) {
    const plan = compileResolutionPlan({ field, mediaType: input.mediaType, resolution, fieldProviders: config.fieldProviders,
      metadataLocale: locale, fallbackLocales: config.localization.metadataFallbackLocales });
    for (const step of plan.generatedSteps) if (step.locale?.type === 'locale') requestedLocales.add(step.locale.value);
  }
  const fallbacks = [...requestedLocales];
  const region =
    config.localization.availabilityRegion || config.localization.contentRegion;
  const apiKey =
    input.apiKey ||
    await input.getSecret('tmdb') ||
    process.env.METALAYER_TMDB_API_KEY ||
    process.env.TMDB_API;

  const tmdb = createAppProviderAdapter(app, 'tmdb', {
    apiKey,
    cache: app.providerCache,
    stremioPublicId: config.identity?.stremioPublicId || 'imdb',
  });

  if (!(tmdb instanceof TmdbProviderAdapter)) {
    throw new ProviderError({
      code: 'upstream',
      providerId: 'tmdb',
      message: 'TMDB adapter unavailable',
      retryable: false,
    });
  }

  const ctx = {
    correlationId: input.correlationId,
    locale,
    region,
    apiKey,
  };

  const load = async (requestedLocale: string) => {
    if (input.mediaType === 'series') {
      const series = await tmdb.getSeriesByPublicId({ ...ctx, locale: requestedLocale }, input.id);
      return { ...series, releaseDate: series.firstAirDate };
    }
    return tmdb.getMovieByPublicId({ ...ctx, locale: requestedLocale }, input.id);
  };
  const movie = await load(locale);

  const bag: ProviderFieldBag = {
    title: [{ provider: 'tmdb', value: movie.title, locale }],
    originalTitle: [{ provider: 'tmdb', value: movie.originalTitle ?? null }],
    description: [{ provider: 'tmdb', value: movie.overview ?? null, locale }],
    poster: [
      {
        provider: 'tmdb',
        value: tmdbImageUrl(movie.posterPath, 'w500'),
      },
    ],
    background: [
      {
        provider: 'tmdb',
        value: tmdbImageUrl(movie.backdropPath, 'w1280'),
      },
    ],
    logo: [],
    rating: [
      {
        provider: 'tmdb',
        value: movie.voteAverage ?? null,
        confidence: 0.6,
      },
    ],
    voteCount: [],
    releaseDate: [{ provider: 'tmdb', value: movie.releaseDate ?? null }],
    externalIds: [
      {
        provider: 'tmdb',
        value: {
          tmdb: movie.id,
          imdb: movie.imdbId,
        },
      },
    ],
  };

  if (movie.originalLanguage && !fallbacks.includes(movie.originalLanguage)) fallbacks.push(movie.originalLanguage);
  for (const fallback of fallbacks) {
    if (fallback === locale) continue;
    try {
      const alt = await load(fallback);
      bag.title!.push({ provider: 'tmdb', value: alt.title, locale: fallback });
      bag.description!.push({
        provider: 'tmdb',
        value: alt.overview ?? null,
        locale: fallback,
      });
    } catch {
      // ignore missing fallback locale fetch
    }
  }

  if (movie.imdbId) {
    try {
      const imdb = createAppProviderAdapter(app, 'imdb', {
        cache: app.providerCache,
      });
      if (imdb instanceof ImdbProviderAdapter) {
        const meta = await imdb.getMeta(
          { correlationId: input.correlationId },
          movie.imdbId,
          input.mediaType === 'series' ? 'series' : 'movie',
        );
        // Cinemeta has no locale negotiation — omit locale on text fields.
        if (meta.title) {
          bag.title!.push({
            provider: 'imdb',
            value: meta.title,
            confidence: 0.8,
          });
        }
        if (meta.originalTitle) {
          bag.originalTitle!.push({
            provider: 'imdb',
            value: meta.originalTitle,
            confidence: 0.75,
          });
        }
        if (meta.description) {
          bag.description!.push({
            provider: 'imdb',
            value: meta.description,
            confidence: 0.75,
          });
        }
        if (meta.poster) {
          bag.poster!.push({
            provider: 'imdb',
            value: meta.poster,
            confidence: 0.85,
          });
        }
        if (meta.background) {
          bag.background!.push({
            provider: 'imdb',
            value: meta.background,
            confidence: 0.85,
          });
        }
        if (meta.logo) {
          bag.logo!.push({
            provider: 'imdb',
            value: meta.logo,
            confidence: 0.85,
          });
        }
        bag.rating!.push({
          provider: 'imdb',
          value: meta.rating ?? null,
          confidence: 0.95,
        });
        if (meta.releaseDate || meta.releaseYear) {
          bag.releaseDate!.push({
            provider: 'imdb',
            value: meta.releaseDate ?? meta.releaseYear ?? null,
            confidence: 0.8,
          });
        }
        bag.externalIds!.push({
          provider: 'imdb',
          value: meta.externalIds,
          confidence: 0.95,
        });
      }
    } catch {
      // Cinemeta metadata optional
    }
  }

  const fanartKey = await input.getSecret('fanart');
  if (fanartKey && input.mediaType === 'movie') {
    try {
      const fanart = createAppProviderAdapter(app, 'fanart', {
        apiKey: fanartKey,
      });
      if (fanart instanceof FanartArtworkAdapter) {
        const art = await fanart.getMovieArtwork(
          {
            correlationId: input.correlationId,
            locale,
            region,
            apiKey: fanartKey,
          },
          movie.id,
        );
        const poster = pickAssetUrl(art.assets, 'poster');
        const background = pickAssetUrl(art.assets, 'background');
        const logo = pickAssetUrl(art.assets, 'logo');
        if (logo) bag.logo!.push({ provider: 'fanart', value: logo });
        if (poster) bag.poster!.unshift({ provider: 'fanart', value: poster });
        if (background) {
          bag.background!.unshift({ provider: 'fanart', value: background });
        }
      }
    } catch {
      // optional
    }
  }

  const rpdbKey = await input.getSecret('rpdb');
  if (rpdbKey) {
    try {
      const rpdb = createAppProviderAdapter(app, 'rpdb', {
        apiKey: rpdbKey,
      });
      if (rpdb instanceof RpdbArtworkAdapter) {
        const art = (input.mediaType === 'series' ? rpdb.getSeriesArtwork.bind(rpdb) : rpdb.getMovieArtwork.bind(rpdb))(
          {
            correlationId: input.correlationId,
            locale,
            region,
            apiKey: rpdbKey,
          },
          movie.id,
        );
        const poster = pickAssetUrl(art.assets, 'poster');
        if (poster) bag.poster!.unshift({ provider: 'rpdb', value: poster });
      }
    } catch {
      // optional
    }
  }

  return { bag, publicId: movie.publicId, originalLanguage: movie.originalLanguage };
}

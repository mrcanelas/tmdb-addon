import { describe, expect, it } from 'vitest';
import {
  applyProfileToConfig,
  createDefaultMetaLayerConfig,
  listLegacySecretsPresent,
  METALAYER_CONFIG_VERSION,
  parseLegacyAddonConfig,
  parseMetaLayerConfig,
} from './index.js';

describe('@metalayer/config', () => {
  it('creates a valid default MetaLayer config at version 1', () => {
    const config = createDefaultMetaLayerConfig({ name: 'Family' });
    expect(config.configVersion).toBe(METALAYER_CONFIG_VERSION);
    expect(config.name).toBe('Family');
    expect(config.localization.interfaceLocale).toBe('en-US');
    expect(config.identity.stremioPublicId).toBe('imdb');
    expect(config.presentation.catalogNamePrefix).toBe(false);
    expect(config.profiles).toEqual([]);
    expect(() => parseMetaLayerConfig(config)).not.toThrow();
  });

  it('rejects missing configVersion', () => {
    const config = createDefaultMetaLayerConfig();
    const { configVersion: _, ...invalid } = config;
    expect(() => parseMetaLayerConfig(invalid)).toThrow();
  });

  it('parses legacy configs and lists secrets without exposing values', () => {
    const legacy = parseLegacyAddonConfig({
      language: 'pt-BR',
      tmdbApiKey: 'secret-key',
      catalogs: [{ id: 'tmdb.popular', type: 'movie', showInHome: true }],
    });
    expect(legacy.language).toBe('pt-BR');
    expect(listLegacySecretsPresent(legacy)).toEqual(['tmdbApiKey']);
  });

  it('applyProfileToConfig merges localization, catalogs, rules, sorting, and presentation', () => {
    const movie = {
      instanceId: 'cat_movie',
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie' as const,
      originalName: 'Trending',
      enabled: true,
      showInHome: true,
      position: 0,
      tags: [] as string[],
    };
    const series = {
      instanceId: 'cat_series',
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'series' as const,
      originalName: 'Popular',
      enabled: true,
      showInHome: true,
      position: 1,
      tags: [] as string[],
    };
    const config = createDefaultMetaLayerConfig({
      name: 'Family',
      catalogs: [movie, series],
      globalRules: {
        minimumRating: 6,
        excludeAdult: false,
        yearFrom: 2000,
      },
      globalSorting: {
        criteria: [{ field: 'popularity', direction: 'desc' }],
        stable: true,
      },
      presentation: {
        catalogNamePrefix: false,
        showAgeRatingInGenres: false,
        hideEpisodeSpoilers: false,
        ratingPostersForLibrary: false,
        castCount: 10,
      },
    });

    const effective = applyProfileToConfig(config, {
      profileId: 'kids',
      name: 'Kids',
      enabled: true,
      localization: {
        metadataLocale: 'pt-BR',
        contentRegion: 'BR',
      },
      catalogInstanceIds: ['cat_movie'],
      rules: {
        minimumRating: 8,
        excludeAdult: true,
        hideWatched: true,
      },
      sorting: {
        criteria: [{ field: 'title', direction: 'asc' }],
        stable: true,
      },
      presentation: {
        castCount: 5,
        hideEpisodeSpoilers: true,
      },
      trackingProvider: 'trakt',
    });

    expect(effective.name).toBe('Family · Kids');
    expect(effective.localization.metadataLocale).toBe('pt-BR');
    expect(effective.localization.contentRegion).toBe('BR');
    expect(effective.localization.interfaceLocale).toBe('en-US');
    expect(effective.catalogs.map((c) => c.instanceId)).toEqual(['cat_movie']);
    expect(effective.globalRules).toEqual({
      minimumRating: 8,
      excludeAdult: true,
      yearFrom: 2000,
      hideWatched: true,
    });
    expect(effective.globalSorting).toEqual({
      criteria: [{ field: 'title', direction: 'asc' }],
      stable: true,
    });
    expect(effective.presentation.castCount).toBe(5);
    expect(effective.presentation.hideEpisodeSpoilers).toBe(true);
    expect(effective.presentation.catalogNamePrefix).toBe(false);
    // Additive profile fields remain backward-compatible at configVersion 1.
    expect(effective.configVersion).toBe(1);
    expect(() => parseMetaLayerConfig(config)).not.toThrow();
  });

  it('accepts profiles with optional override fields without a version bump', () => {
    const config = createDefaultMetaLayerConfig({
      profiles: [
        {
          profileId: 'anime',
          name: 'Anime',
          enabled: true,
          rules: { yearFrom: 2015 },
          sorting: {
            criteria: [{ field: 'rating', direction: 'desc' }],
            stable: true,
          },
          presentation: { castCount: 15 },
          trackingProvider: 'anilist',
        },
      ],
    });
    expect(config.configVersion).toBe(1);
    expect(config.profiles[0]?.trackingProvider).toBe('anilist');
    expect(() => parseMetaLayerConfig(config)).not.toThrow();
  });
});

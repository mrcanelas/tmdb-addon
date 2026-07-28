import { describe, expect, it } from 'vitest';
import {
  applyPresentation,
  localePreferencesFromLocalization,
} from './presentation.js';

describe('applyPresentation', () => {
  it('truncates cast to the configured count', () => {
    const result = applyPresentation(
      {
        cast: ['A', 'B', 'C', 'D', 'E', 'F'],
      },
      {
        castCount: 5,
        catalogNamePrefix: false,
        showAgeRatingInGenres: false,
        hideEpisodeSpoilers: false,
        ratingPostersForLibrary: false,
      },
    );
    expect(result.meta.cast).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.warnings).toEqual([]);
  });

  it('prepends certification to genres when enabled', () => {
    const result = applyPresentation(
      {
        genres: ['Drama', 'Crime'],
        certification: 'TV-MA',
      },
      {
        catalogNamePrefix: false,
        showAgeRatingInGenres: true,
        hideEpisodeSpoilers: false,
        ratingPostersForLibrary: false,
      },
    );
    expect(result.meta.genres).toEqual(['TV-MA', 'Drama', 'Crime']);
  });

  it('emits deferred-runtime warnings for spoilers and library posters', () => {
    const result = applyPresentation(
      { name: 'Title' },
      {
        catalogNamePrefix: false,
        showAgeRatingInGenres: false,
        hideEpisodeSpoilers: true,
        ratingPostersForLibrary: true,
      },
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'presentation.hideEpisodeSpoilers.pendingRuntime',
        'presentation.ratingPostersForLibrary.pendingRuntime',
      ]),
    );
  });
});

describe('localePreferencesFromLocalization', () => {
  it('orders primary locale then fallbacks then original', () => {
    expect(
      localePreferencesFromLocalization({
        metadataLocale: 'pt-BR',
        metadataFallbackLocales: ['en-US', 'es-ES', 'pt-BR'],
      }),
    ).toEqual([
      { type: 'locale', value: 'pt-BR' },
      { type: 'locale', value: 'en-US' },
      { type: 'locale', value: 'es-ES' },
      { type: 'original-language' },
    ]);
  });

  it('includes no-language for artwork chains', () => {
    expect(
      localePreferencesFromLocalization(
        {
          metadataLocale: 'pt-BR',
          metadataFallbackLocales: ['en-US'],
        },
        { includeNoLanguage: true },
      ),
    ).toEqual([
      { type: 'locale', value: 'pt-BR' },
      { type: 'locale', value: 'en-US' },
      { type: 'no-language' },
      { type: 'original-language' },
    ]);
  });
});

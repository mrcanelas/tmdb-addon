import { describe, expect, it } from 'vitest';
import {
  applyCatalogNamePrefix,
  CATALOG_NAME_PREFIX,
  createDefaultMetaLayerConfig,
  parsePresentationConfig,
} from './index.js';

describe('presentation config', () => {
  it('defaults all presentation toggles off with unlimited cast', () => {
    const config = createDefaultMetaLayerConfig();
    expect(config.presentation).toEqual({
      catalogNamePrefix: false,
      showAgeRatingInGenres: false,
      hideEpisodeSpoilers: false,
      ratingPostersForLibrary: false,
    });
    expect(config.presentation.castCount).toBeUndefined();
  });

  it('parses castCount options and rejects invalid values', () => {
    expect(parsePresentationConfig({ castCount: 10 }).castCount).toBe(10);
    expect(() => parsePresentationConfig({ castCount: 7 })).toThrow();
  });

  it('prefixes catalog names without duplicating the prefix', () => {
    expect(
      applyCatalogNamePrefix('Trending Movies', { catalogNamePrefix: true }),
    ).toBe(`${CATALOG_NAME_PREFIX}Trending Movies`);
    expect(
      applyCatalogNamePrefix(`${CATALOG_NAME_PREFIX}Trending Movies`, {
        catalogNamePrefix: true,
      }),
    ).toBe(`${CATALOG_NAME_PREFIX}Trending Movies`);
    expect(
      applyCatalogNamePrefix('Trending Movies', { catalogNamePrefix: false }),
    ).toBe('Trending Movies');
  });
});

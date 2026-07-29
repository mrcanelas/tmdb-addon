import { describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from './studio.js';
import { filterMetasByEffectiveRules } from './rules-filter.js';
import type { CatalogMetaPreview } from './merge.js';

describe('filterMetasByEffectiveRules', () => {
  const catalog = createCatalogInstance({
    provider: 'tmdb',
    providerCatalogId: 'popular',
    mediaType: 'movie',
    originalName: 'Popular',
    position: 0,
  });

  const metas: CatalogMetaPreview[] = [
    {
      id: 'tt1',
      type: 'movie',
      name: 'Adult Hit',
      adult: true,
      rating: 9,
      genres: ['Drama'],
    },
    {
      id: 'tt2',
      type: 'movie',
      name: 'Low Rated',
      adult: false,
      rating: 4,
      genres: ['Horror'],
    },
    {
      id: 'tt3',
      type: 'movie',
      name: 'Keeper',
      adult: false,
      rating: 8.4,
      genres: ['Drama'],
      released: true,
    },
  ];

  it('filters by globalRules excludeAdult and minimumRating', () => {
    const config = createDefaultMetaLayerConfig({
      name: 'Rules',
      catalogs: [catalog],
      globalRules: { excludeAdult: true, minimumRating: 7 },
    });
    const filtered = filterMetasByEffectiveRules(metas, config, catalog);
    expect(filtered.map((item) => item.id)).toEqual(['tt3']);
  });

  it('applies catalog rule overrides on top of global', () => {
    const local = {
      ...catalog,
      rules: { minimumRating: 3 },
    };
    const config = createDefaultMetaLayerConfig({
      name: 'Rules',
      catalogs: [local],
      globalRules: { excludeAdult: true, minimumRating: 7 },
    });
    const filtered = filterMetasByEffectiveRules(metas, config, local);
    expect(filtered.map((item) => item.id)).toEqual(['tt2', 'tt3']);
  });

  it('filters excludeGenres and excludeKeywords', () => {
    const config = createDefaultMetaLayerConfig({
      name: 'Rules',
      catalogs: [catalog],
      globalRules: {
        excludeGenres: ['Horror'],
        excludeKeywords: ['adult'],
      },
    });
    const filtered = filterMetasByEffectiveRules(metas, config, catalog);
    expect(filtered.map((item) => item.id)).toEqual(['tt3']);
  });
});

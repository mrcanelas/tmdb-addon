import { describe, expect, it } from 'vitest';
import type { CatalogDefinition } from '@metalayer/config';
import {
  createCatalogInstance,
  duplicateCatalog,
  moveCatalog,
  renameCatalog,
  resolveCatalogDisplayName,
  setCatalogEnabled,
  sortCatalogsByPosition,
  toManifestCatalogEntries,
} from './studio.js';

function catalog(
  partial: Partial<CatalogDefinition> &
    Pick<CatalogDefinition, 'instanceId' | 'position' | 'mediaType'>,
): CatalogDefinition {
  return {
    provider: 'tmdb',
    providerCatalogId: 'popular',
    originalName: 'Popular',
    enabled: true,
    showInHome: true,
    tags: [],
    ...partial,
  };
}

describe('@metalayer/catalogs studio', () => {
  it('keeps a single unified order for movie, series, and anime', () => {
    const catalogs = [
      catalog({
        instanceId: 'a',
        position: 2,
        mediaType: 'anime',
        originalName: 'Anime',
      }),
      catalog({
        instanceId: 'b',
        position: 0,
        mediaType: 'movie',
        originalName: 'Movies',
      }),
      catalog({
        instanceId: 'c',
        position: 1,
        mediaType: 'series',
        originalName: 'Series',
        enabled: false,
      }),
    ];

    const ordered = sortCatalogsByPosition(catalogs).map((item) => item.instanceId);
    expect(ordered).toEqual(['b', 'c', 'a']);

    const manifest = toManifestCatalogEntries(catalogs, 'pt-BR');
    expect(manifest.map((item) => item.instanceId)).toEqual(['b', 'a']);
    expect(manifest.map((item) => item.type)).toEqual(['movie', 'anime']);
  });

  it('renames, duplicates, moves, and toggles without breaking positions', () => {
    let catalogs = [
      createCatalogInstance({
        provider: 'tmdb',
        providerCatalogId: 'trending',
        mediaType: 'movie',
        originalName: 'Trending',
      }),
      createCatalogInstance({
        provider: 'tmdb',
        providerCatalogId: 'top_rated',
        mediaType: 'series',
        originalName: 'Top',
      }),
    ];
    catalogs = catalogs.map((item, index) => ({ ...item, position: index }));

    catalogs = renameCatalog(catalogs, catalogs[0].instanceId, 'Em alta');
    expect(catalogs[0].customName).toBe('Em alta');

    catalogs = duplicateCatalog(catalogs, catalogs[0].instanceId, {
      copySuffix: 'cópia',
    });
    expect(catalogs).toHaveLength(3);
    expect(catalogs.map((item) => item.position)).toEqual([0, 1, 2]);
    expect(catalogs[1]?.customName).toBe('Em alta (cópia)');

    const movedId = catalogs[2].instanceId;
    catalogs = moveCatalog(catalogs, movedId, 0);
    expect(catalogs[0].instanceId).toBe(movedId);
    expect(catalogs.map((item) => item.position)).toEqual([0, 1, 2]);

    catalogs = setCatalogEnabled(catalogs, movedId, false);
    expect(toManifestCatalogEntries(catalogs)).toHaveLength(2);
  });

  it('resolves localized catalog names with language fallback', () => {
    const localized = catalog({
      instanceId: 'loc',
      position: 0,
      mediaType: 'movie',
      originalName: 'Trending Movies',
      name: {
        default: 'Trending Movies',
        values: {
          'pt-BR': 'Filmes em alta',
          'es-ES': 'Películas en tendencia',
        },
      },
    });

    expect(resolveCatalogDisplayName(localized, 'pt-BR')).toBe('Filmes em alta');
    expect(resolveCatalogDisplayName(localized, 'pt-PT')).toBe('Filmes em alta');
    expect(resolveCatalogDisplayName(localized, 'es-MX')).toBe(
      'Películas en tendencia',
    );
    expect(resolveCatalogDisplayName(localized, 'en-US')).toBe('Trending Movies');
    expect(resolveCatalogDisplayName(localized)).toBe('Trending Movies');
  });
});

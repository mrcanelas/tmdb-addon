import { describe, expect, it } from 'vitest';
import type { CatalogListItem } from '@/lib/api';
import {
  invertSelection,
  selectAllVisible,
  selectByMediaType,
  selectByProvider,
  toggleSelection,
  uniqueProviders,
} from './catalog-selection';

function item(
  partial: Pick<CatalogListItem, 'instanceId' | 'provider' | 'mediaType'>,
): CatalogListItem {
  return {
    originalName: partial.instanceId,
    enabled: true,
    showInHome: true,
    position: 0,
    tags: [],
    providerCatalogId: 'x',
    ...partial,
  };
}

describe('catalog-selection', () => {
  const catalogs = [
    item({ instanceId: 'a', provider: 'tmdb', mediaType: 'movie' }),
    item({ instanceId: 'b', provider: 'tmdb', mediaType: 'series' }),
    item({ instanceId: 'c', provider: 'trakt', mediaType: 'movie' }),
  ];

  it('toggles selection membership', () => {
    const once = toggleSelection(new Set(), 'a');
    expect(once.has('a')).toBe(true);
    expect(toggleSelection(once, 'a').has('a')).toBe(false);
  });

  it('selects all visible and by provider/type', () => {
    expect([...selectAllVisible(catalogs)].sort()).toEqual(['a', 'b', 'c']);
    expect([
      ...selectByProvider(catalogs, 'tmdb', new Set()),
    ].sort()).toEqual(['a', 'b']);
    expect([
      ...selectByMediaType(catalogs, 'movie', new Set()),
    ].sort()).toEqual(['a', 'c']);
  });

  it('inverts selection and lists providers', () => {
    expect([...invertSelection(catalogs, new Set(['a']))].sort()).toEqual([
      'b',
      'c',
    ]);
    expect(uniqueProviders(catalogs)).toEqual(['tmdb', 'trakt']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createPublicMetaDBListCatalogDrafts,
  createPublicMetaDBPickCatalogDrafts,
  createPublicMetaDBUpNextCatalogDraft,
  detectPublicMetaDBListMediaTypes,
  filterNewPublicMetaDBCatalogs,
} from './publicmetadb-catalogs.js';

describe('publicmetadb catalog drafts', () => {
  it('creates up next catalog draft', () => {
    expect(createPublicMetaDBUpNextCatalogDraft()).toMatchObject({
      provider: 'publicmetadb',
      providerCatalogId: 'upnext',
      mediaType: 'series',
    });
  });

  it('detects mixed list media types', () => {
    expect(
      detectPublicMetaDBListMediaTypes([
        { media_type: 'movie' },
        { media_type: 'tv' },
      ]),
    ).toEqual(['movie', 'series']);
  });

  it('splits mixed lists into movie and series drafts', () => {
    const drafts = createPublicMetaDBListCatalogDrafts(
      { id: 'abc', name: 'Sci-Fi' },
      ['movie', 'series'],
    );
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.providerCatalogId).toBe('list.abc');
    expect(drafts.map((d) => d.mediaType)).toEqual(['movie', 'series']);
  });

  it('creates pick drafts from filter media types', () => {
    const drafts = createPublicMetaDBPickCatalogDrafts({
      id: 'p1',
      name: 'For You',
      filters: { media_types: ['movie', 'tv'] },
    });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.providerCatalogId).toBe('pick.p1');
  });

  it('filters duplicates by provider catalog id and media type', () => {
    const incoming = createPublicMetaDBListCatalogDrafts(
      { id: '1', name: 'Watchlist' },
      ['movie'],
    );
    const filtered = filterNewPublicMetaDBCatalogs(
      [
        {
          instanceId: 'cat_existing',
          provider: 'publicmetadb',
          providerCatalogId: 'list.1',
          mediaType: 'movie',
          originalName: 'Watchlist',
          enabled: true,
          showInHome: true,
          position: 0,
          tags: [],
        },
      ],
      incoming,
    );
    expect(filtered).toHaveLength(0);
  });
});

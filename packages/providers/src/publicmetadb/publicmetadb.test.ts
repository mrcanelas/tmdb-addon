import { describe, expect, it, vi } from 'vitest';
import { PublicMetaDBAdapter } from './adapter.js';
import {
  buildPublicMetaDBUrl,
  isPublicMetaDBApiKey,
  markPublicMetaDBWatched,
  validatePublicMetaDBKey,
} from './client.js';

describe('PublicMetaDB client', () => {
  it('builds external API URLs', () => {
    expect(buildPublicMetaDBUrl('/api/external/lists')).toBe(
      'https://publicmetadb.com/api/external/lists',
    );
  });

  it('validates pm- key prefix', () => {
    expect(isPublicMetaDBApiKey('pm-abc123')).toBe(true);
    expect(isPublicMetaDBApiKey('sk-abc123')).toBe(false);
  });

  it('validates keys via lists probe', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      validatePublicMetaDBKey({ apiKey: 'pm-test', fetchImpl }),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://publicmetadb.com/api/external/lists?perPage=1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer pm-test',
        }),
      }),
    );
  });

  it('posts watched check-ins with dedupe', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await markPublicMetaDBWatched({
      apiKey: 'pm-test',
      tmdbId: 550,
      mediaType: 'movie',
      fetchImpl,
    });

    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://publicmetadb.com/api/external/watched?dedupe=true',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tmdb_id: 550, media_type: 'movie' }),
      }),
    );
  });
});

describe('PublicMetaDBAdapter', () => {
  it('rejects invalid key format on ping', async () => {
    const adapter = new PublicMetaDBAdapter({ apiKey: 'not-a-pm-key' });
    await expect(
      adapter.ping({ correlationId: 'test', apiKey: 'not-a-pm-key' }),
    ).rejects.toMatchObject({ code: 'auth' });
  });

  it('pings with fixture-backed lists when key is valid', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ id: '1', name: 'Watchlist' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const adapter = new PublicMetaDBAdapter({ apiKey: 'pm-test', fetchImpl });
    const health = await adapter.ping({ correlationId: 'test', apiKey: 'pm-test' });
    expect(health.state).toBe('healthy');
  });

  it('returns resume fixture without network', async () => {
    const adapter = new PublicMetaDBAdapter({
      apiKey: 'pm-test',
      resumeFixture: [{ tmdb_id: 1399, media_type: 'tv', season: 1, episode: 2 }],
    });

    const items = await adapter.getResume();
    expect(items).toEqual([
      { tmdb_id: 1399, media_type: 'tv', season: 1, episode: 2 },
    ]);
  });

  it('filters catalog page items by media type', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/lists/abc/items')) {
        return new Response(
          JSON.stringify({
            items: [
              { tmdb_id: 550, media_type: 'movie' },
              { tmdb_id: 1399, media_type: 'tv' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    });

    const adapter = new PublicMetaDBAdapter({ apiKey: 'pm-test', fetchImpl });
    const movies = await adapter.getCatalogPage(
      { correlationId: 'test', apiKey: 'pm-test' },
      { providerCatalogId: 'list.abc', mediaType: 'movie', page: 1 },
    );
    expect(movies).toEqual([
      { publicId: 'tmdb:550', mediaType: 'movie', name: 'TMDB 550' },
    ]);
  });
});

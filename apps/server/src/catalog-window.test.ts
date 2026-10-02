import { describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** 20 cards per page; ids encode page+index; rating decreases across pages. */
function tmdbPage(page: number, totalPages: number) {
  return json({
    page,
    total_pages: totalPages,
    results: Array.from({ length: 20 }, (_, index) => ({
      id: page * 1000 + index,
      title: `P${page} #${index}`,
      poster_path: '/p.jpg',
      release_date: '2000-01-01',
      vote_average: (index % 2 === 0 ? 8 : 3) + page / 10,
      vote_count: 100,
      genre_ids: [18],
    })),
  });
}

async function setup(seed: number, config: ReturnType<typeof createDefaultMetaLayerConfig>, totalPages: number) {
  const fetched: number[] = [];
  const app = await buildApp({
    logger: false,
    store: createMemoryConfigurationStore(Buffer.alloc(32, seed).toString('base64')),
    providerFetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes('/movie/popular')) {
        const page = Number(url.searchParams.get('page') ?? '1');
        fetched.push(page);
        return tmdbPage(page, totalPages);
      }
      return json({ results: [] });
    },
  });
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/configurations',
    payload: { editCredential: 'window-credential', secrets: { tmdb: 'test-tmdb-key' }, config },
  });
  expect(created.statusCode).toBe(201);
  return { app, fetched, configId: created.json().configId as string };
}

describe('materialized catalog window', () => {
  it('continues from the buffered cursor instead of restarting at page 1', async () => {
    const popular = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'movie',
      originalName: 'Popular',
      position: 0,
    });
    const { app, fetched, configId } = await setup(61, createDefaultMetaLayerConfig({
      name: 'Window',
      catalogs: [popular],
      // Keeps only even-index cards → 10 delivered per upstream page.
      globalRules: { minimumRating: 5 },
    }), 5);

    const first = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/tmdb.popular.json` });
    expect(first.statusCode).toBe(200);
    expect(first.json().metas).toHaveLength(20);
    expect(first.json().metas[0].name).toBe('P1 #0');
    expect(first.json().metas[19].name).toBe('P2 #18');
    expect(fetched).toEqual([1, 2]);

    const second = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/tmdb.popular/skip=20.json` });
    expect(second.json().metas).toHaveLength(20);
    expect(second.json().metas[0].name).toBe('P3 #0');
    // Only the two new pages were fetched; pages 1–2 came from the window buffer.
    expect(fetched).toEqual([1, 2, 3, 4]);

    const beyond = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/tmdb.popular/skip=40.json` });
    expect(beyond.json().metas).toHaveLength(10);
    expect(fetched).toEqual([1, 2, 3, 4, 5]);
    expect(beyond.json().warnings ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CATALOG_SCAN_LIMIT' })]),
    );

    await app.close();
  });

  it('sorts across the gathered buffer and reports the sort scope', async () => {
    const popular = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'movie',
      originalName: 'Popular',
      position: 0,
      sorting: { criteria: [{ field: 'rating', direction: 'desc' }], stable: true },
    });
    const { app, fetched, configId } = await setup(62, createDefaultMetaLayerConfig({
      name: 'Sorted',
      catalogs: [popular],
    }), 3);

    const res = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/tmdb.popular.json` });
    expect(res.statusCode).toBe(200);
    // All 3 upstream pages (within the sort budget) were gathered before sorting.
    expect(fetched).toEqual([1, 2, 3]);
    const names: string[] = res.json().metas.map((meta: { name: string }) => meta.name);
    // Highest rating is page 3 even-index cards (8.3), then page 2 (8.2).
    expect(names.slice(0, 10).every((name) => name.startsWith('P3 #'))).toBe(true);
    expect(names.slice(10, 20).every((name) => name.startsWith('P2 #'))).toBe(true);
    expect(res.json().warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CATALOG_SORT_SCOPE',
          params: expect.objectContaining({ sortedItems: 60, sourcePages: 3, complete: true }),
        }),
      ]),
    );

    await app.close();
  });

  it('reports CATALOG_SCAN_LIMIT when the per-request budget is exhausted', async () => {
    process.env.METALAYER_CATALOG_SCAN_PAGES = '2';
    try {
      const popular = createCatalogInstance({
        provider: 'tmdb',
        providerCatalogId: 'popular',
        mediaType: 'movie',
        originalName: 'Popular',
        position: 0,
      });
      const { app, fetched, configId } = await setup(63, createDefaultMetaLayerConfig({
        name: 'Budget',
        catalogs: [popular],
        // Nothing passes → window can never fill 20 cards.
        globalRules: { minimumRating: 9.9 },
      }), 50);
      const res = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/tmdb.popular.json` });
      expect(res.json().metas).toEqual([]);
      expect(fetched).toEqual([1, 2]);
      expect(res.json().warnings).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'CATALOG_SCAN_LIMIT', params: { maxPages: 2 } })]),
      );
      await app.close();
    } finally {
      delete process.env.METALAYER_CATALOG_SCAN_PAGES;
    }
  });
});

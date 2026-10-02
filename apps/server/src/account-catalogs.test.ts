import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const previousEnv = {
  TRAKT_CLIENT_ID: process.env.TRAKT_CLIENT_ID,
  TRAKT_CLIENT_SECRET: process.env.TRAKT_CLIENT_SECRET,
};

beforeAll(() => {
  process.env.TRAKT_CLIENT_ID = 'trakt-client-test';
  process.env.TRAKT_CLIENT_SECRET = 'trakt-secret-test';
});

afterAll(() => {
  process.env.TRAKT_CLIENT_ID = previousEnv.TRAKT_CLIENT_ID;
  process.env.TRAKT_CLIENT_SECRET = previousEnv.TRAKT_CLIENT_SECRET;
});

async function setup(seed: number, config: ReturnType<typeof createDefaultMetaLayerConfig>) {
  const requests: Array<{ url: string; auth?: string }> = [];
  const app = await buildApp({
    logger: false,
    store: createMemoryConfigurationStore(Buffer.alloc(32, seed).toString('base64')),
    providerFetch: async (input, init) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      requests.push({ url, auth: headers.Authorization });
      if (url.startsWith('https://api.trakt.tv/sync/watchlist/movies/rank')) {
        if (!headers.Authorization) return json({ error: 'unauthorized' }, 401);
        return json([
          { rank: 1, type: 'movie', movie: { title: 'Heat', year: 1995, ids: { imdb: 'tt0113277', tmdb: 949 } } },
          { rank: 2, type: 'movie', movie: { title: 'Ronin', year: 1998, ids: { tmdb: 8195 } } },
          { rank: 3, type: 'show', show: { title: 'Ignored', ids: { imdb: 'tt0000001' } } },
        ]);
      }
      if (url.startsWith('https://api.trakt.tv/movies/trending')) {
        return json([{ watchers: 10, movie: { title: 'Trending', year: 2020, ids: { imdb: 'tt0000002' } } }]);
      }
      if (url.startsWith('https://api.trakt.tv/users/me/lists')) {
        return json([{ name: 'Favourites', ids: { slug: 'favourites' }, item_count: 3 }]);
      }
      if (url.startsWith('https://api.mdblist.com/lists/12345/items')) {
        return json({
          movies: [
            { id: 550, rank: 1, title: 'Fight Club', imdb_id: 'tt0137523', release_year: 1999 },
            { id: 603, rank: 2, title: 'The Matrix', imdb_id: 'tt0133093', release_year: 1999 },
          ],
          shows: [],
        });
      }
      return json({ results: [] });
    },
  });
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/configurations',
    payload: { editCredential: 'account-credential', secrets: { tmdb: 'test-tmdb-key' }, config },
  });
  expect(created.statusCode).toBe(201);
  return { app, requests, configId: created.json().configId as string };
}

describe('account and AI catalogs delivery (W2)', () => {
  it('serves a Trakt watchlist from the vaulted OAuth token and keeps list order', async () => {
    const watchlist = createCatalogInstance({
      provider: 'trakt',
      providerCatalogId: 'watchlist',
      mediaType: 'movie',
      originalName: 'Trakt Watchlist',
      position: 0,
    });
    const { app, requests, configId } = await setup(71, createDefaultMetaLayerConfig({
      name: 'Trakt',
      catalogs: [watchlist],
    }));

    const missing = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/trakt.watchlist.json` });
    expect(missing.statusCode).toBe(200);
    expect(missing.json().metas).toEqual([]);
    expect(missing.json().warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'SOURCE_CREDENTIAL_MISSING' })]),
    );

    await app.configStore.upsertVaultSecret(configId, 'trakt', 'oauth_access', 'trakt-access-token');
    const res = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/trakt.watchlist.json` });
    expect(res.statusCode).toBe(200);
    expect(res.json().metas.map((meta: { id: string }) => meta.id)).toEqual(['tt0113277', 'tmdb:8195']);
    expect(res.json().metas[0].name).toBe('Heat');
    // Token travels in the Authorization header, never in the URL.
    const trakt = requests.find((entry) => entry.url.includes('/sync/watchlist'));
    expect(trakt?.auth).toBe('Bearer trakt-access-token');
    expect(trakt?.url).not.toContain('trakt-access-token');
    expect(JSON.stringify(res.json())).not.toContain('trakt-access-token');

    await app.close();
  });

  it('serves public Trakt trending without a user token', async () => {
    const trending = createCatalogInstance({
      provider: 'trakt',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trakt Trending',
      position: 0,
    });
    const { app, configId } = await setup(72, createDefaultMetaLayerConfig({ name: 'Trending', catalogs: [trending] }));
    const res = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/trakt.trending.json` });
    expect(res.json().metas).toHaveLength(1);
    expect(res.json().metas[0].id).toBe('tt0000002');
    await app.close();
  });

  it('serves legacy MDBList list ids with the user API key', async () => {
    const list = createCatalogInstance({
      provider: 'mdblist',
      providerCatalogId: '12345',
      mediaType: 'movie',
      originalName: 'Custom List',
      position: 0,
    });
    const { app, requests, configId } = await setup(73, createDefaultMetaLayerConfig({ name: 'MDB', catalogs: [list] }));
    await app.configStore.upsertVaultSecret(configId, 'mdblist', 'api_key', 'mdb-key');
    const res = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/mdblist.12345.json` });
    expect(res.statusCode).toBe(200);
    expect(res.json().metas.map((meta: { id: string }) => meta.id)).toEqual(['tt0137523', 'tt0133093']);
    expect(requests.some((entry) => entry.url.includes('api.mdblist.com'))).toBe(true);
    await app.close();
  });

  it('serves AI ranked-list catalogs from stored static items', async () => {
    const ranked = createCatalogInstance({
      provider: 'metalayer',
      providerCatalogId: 'ai.ranked-list',
      mediaType: 'movie',
      originalName: 'Best sci-fi',
      position: 0,
      staticItems: Array.from({ length: 25 }, (_, index) => ({
        type: 'movie' as const,
        id: `tt${String(index + 1).padStart(7, '0')}`,
        name: `Rank ${index + 1}`,
        year: 2000 + index,
      })),
    });
    const { app, configId } = await setup(74, createDefaultMetaLayerConfig({ name: 'AI', catalogs: [ranked] }));
    const first = await app.inject({ method: 'GET', url: `/c/${configId}/catalog/movie/metalayer.ai.ranked-list.json` });
    expect(first.statusCode).toBe(200);
    expect(first.json().metas).toHaveLength(20);
    expect(first.json().metas[0].id).toBe('tt0000001');
    const second = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/movie/metalayer.ai.ranked-list/skip=20.json`,
    });
    expect(second.json().metas).toHaveLength(5);
    expect(second.json().metas[0].name).toBe('Rank 21');
    await app.close();
  });

  it('lists only available/connected account catalogs and imports selections', async () => {
    const { app, configId } = await setup(75, createDefaultMetaLayerConfig({ name: 'Picker' }));
    const headers = { 'x-metalayer-edit-credential': 'account-credential' };

    const before = await app.inject({ method: 'GET', url: `/api/v1/configurations/${configId}/catalog-sources`, headers });
    expect(before.statusCode).toBe(200);
    const traktBefore = before.json().sources.find((s: { provider: string }) => s.provider === 'trakt');
    expect(traktBefore.connected).toBe(false);
    expect(traktBefore.catalogs.map((c: { providerCatalogId: string }) => c.providerCatalogId)).toEqual(['trending', 'popular']);
    const mdb = before.json().sources.find((s: { provider: string }) => s.provider === 'mdblist');
    expect(mdb.reason).toBe('SOURCE_CREDENTIAL_MISSING');
    expect(mdb.catalogs).toEqual([]);

    await app.configStore.upsertVaultSecret(configId, 'trakt', 'oauth_access', 'trakt-access-token');
    const after = await app.inject({ method: 'GET', url: `/api/v1/configurations/${configId}/catalog-sources`, headers });
    const traktAfter = after.json().sources.find((s: { provider: string }) => s.provider === 'trakt');
    expect(traktAfter.connected).toBe(true);
    expect(traktAfter.catalogs.map((c: { providerCatalogId: string }) => c.providerCatalogId)).toEqual(
      expect.arrayContaining(['watchlist', 'recommendations', 'list.favourites']),
    );

    const imported = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalog-sources/import`,
      headers,
      payload: {
        selections: [
          { provider: 'trakt', providerCatalogId: 'watchlist', mediaType: 'movie', name: 'Trakt Watchlist' },
          { provider: 'trakt', providerCatalogId: 'list.favourites', mediaType: 'series', name: 'Favourites' },
        ],
      },
    });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().imported).toBe(2);
    expect(imported.json().manifestOrder).toHaveLength(2);

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalog-sources/import`,
      headers,
      payload: {
        selections: [
          { provider: 'trakt', providerCatalogId: 'watchlist', mediaType: 'movie', name: 'Trakt Watchlist' },
        ],
      },
    });
    expect(again.json().imported).toBe(0);
    expect(again.json().skipped).toBe(1);

    const unauthorized = await app.inject({ method: 'GET', url: `/api/v1/configurations/${configId}/catalog-sources` });
    expect(unauthorized.statusCode).toBe(401);
    await app.close();
  });
});

import { afterAll, describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 34).toString('base64');

describe('@metalayer/server legacy Stremio compatibility routes', () => {
  afterAll(async () => {
    // closed per-test apps
  });

  it('serves default /manifest.json with LEGACY identity', async () => {
    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(TEST_KEY),
    });

    const res = await app.inject({ method: 'GET', url: '/manifest.json' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe('tmdb-addon');
    expect(body.version).toBe('3.1.7');
    expect(body.name).toBe('The Movie Database Addon');

    await app.close();
  });

  it('serves language-only catalogChoices as LEGACY manifest', async () => {
    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(TEST_KEY),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/pt-BR/manifest.json',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe('tmdb-addon');

    await app.close();
  });

  it('serves compressed legacy blob manifest and catalog', async () => {
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        language: 'en-US',
        catalogs: [
          {
            id: 'tmdb.trending',
            type: 'movie',
            name: 'Trending',
            enabled: true,
            showInHome: true,
          },
        ],
        tmdbApiKey: 'legacy-key-from-url',
      }),
    );

    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(TEST_KEY),
      providerFetch: async (url) => {
        expect(String(url)).toContain('/trending/movie/week');
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 550,
                title: 'Fight Club',
                poster_path: '/p.jpg',
                release_date: '1999-10-15',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const manifest = await app.inject({
      method: 'GET',
      url: `/${compressed}/manifest.json`,
    });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.json().id).toBe('tmdb-addon');
    expect(manifest.json().catalogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tmdb.trending', type: 'movie' }),
      ]),
    );

    const catalog = await app.inject({
      method: 'GET',
      url: `/${compressed}/catalog/movie/tmdb.trending.json`,
    });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().metas).toHaveLength(1);
    expect(catalog.json().metas[0].name).toBe('Fight Club');

    const empty = await app.inject({
      method: 'GET',
      url: `/${compressed}/catalog/movie/mdblist.unknown.json`,
    });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ metas: [] });

    await app.close();
  });

  it('aliases tmdb.top to popular catalog results', async () => {
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        language: 'en-US',
        catalogs: [
          {
            id: 'tmdb.top',
            type: 'movie',
            name: 'Top',
            enabled: true,
          },
        ],
        tmdbApiKey: 'k',
      }),
    );

    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(TEST_KEY),
      providerFetch: async (url) => {
        expect(String(url)).toContain('/movie/popular');
        return new Response(
          JSON.stringify({ results: [{ id: 1, title: 'A' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const catalog = await app.inject({
      method: 'GET',
      url: `/${compressed}/catalog/movie/tmdb.top.json`,
    });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().metas[0].name).toBe('A');

    await app.close();
  });

  it('does not steal reserved paths as catalogChoices', async () => {
    const store = createMemoryConfigurationStore(TEST_KEY);
    const app = await buildApp({ logger: false, store });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'legacy-compat-credential',
        config: createDefaultMetaLayerConfig({ name: 'Native' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    expect(configId).toBeTruthy();

    const native = await app.inject({
      method: 'GET',
      url: `/c/${configId}/manifest.json`,
    });
    expect(native.statusCode).toBe(200);
    expect(native.json().id).toBe('community.metalayer');

    await app.close();
  });
});

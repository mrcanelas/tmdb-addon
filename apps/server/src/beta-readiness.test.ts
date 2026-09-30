import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDefaultMetaLayerConfig, type MetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance, duplicateCatalog } from '@metalayer/catalogs';
import { buildApp } from './app.js';

const key = Buffer.alloc(32, 61).toString('base64');
const credential = 'beta-test-edit-credential';
const headers = { 'x-metalayer-edit-credential': credential };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });
const catalog = (provider = 'tmdb', mediaType: 'movie' | 'anime' = 'movie') => createCatalogInstance({
  provider, mediaType, providerCatalogId: 'trending', originalName: provider, position: 0,
});
async function create(app: Awaited<ReturnType<typeof buildApp>>, overrides: Partial<MetaLayerConfig> = {}) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/configurations', payload: {
    editCredential: credential, secrets: { tmdb: 'test-key', fanart: 'test-art-key' },
    config: createDefaultMetaLayerConfig({ name: 'Beta regression', ...overrides }),
  } });
  expect(response.statusCode).toBe(201);
  return response.json().configId as string;
}

function fixtureFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input);
  if (url.hostname.includes('cinemeta')) return Promise.resolve(json({ meta: { id: 'tt0137523', name: 'IMDb title', imdbRating: '9.1' } }));
  if (url.hostname.includes('fanart')) return Promise.resolve(json({ movieposter: [{ url: 'https://art.test/poster.jpg', lang: 'en' }], hdmovielogo: [{ url: 'https://art.test/logo.png', lang: 'en' }] }));
  if (url.pathname.includes('/find/')) return Promise.resolve(json({ movie_results: [{ id: 550 }] }));
  if (url.pathname.includes('/movie/550')) return Promise.resolve(json({ id: 550, imdb_id: 'tt0137523', original_language: 'en', original_title: 'Original title',
    title: url.searchParams.get('language') === 'pt-BR' ? '' : 'Fallback title', overview: 'Description', vote_average: 5, poster_path: '/tmdb.jpg' }));
  if (url.hostname.includes('anilist')) {
    const query = JSON.parse(String(init?.body ?? '{}')).query ?? '';
    return Promise.resolve(json({ data: query.includes('Page(') ? { Page: { media: [{ id: 5114, format: 'TV', title: { romaji: 'Anime' } }] } }
      : { Media: { id: 5114, format: 'TV', title: { romaji: 'Anime' }, episodes: 64 } } }));
  }
  if (url.hostname.includes('jikan')) return Promise.resolve(json({ data: url.pathname.includes('/anime/5114')
    ? { mal_id: 5114, title: 'Anime MAL', type: 'TV' }
    : [{ mal_id: 5114, title: 'Anime MAL', type: 'TV' }] }));
  if (url.hostname.includes('kitsu')) return Promise.resolve(json({ data: url.pathname.endsWith('/anime/5114')
    ? { id: '5114', attributes: { canonicalTitle: 'Anime Kitsu', subtype: 'TV' } }
    : [{ id: '5114', attributes: { canonicalTitle: 'Anime Kitsu', subtype: 'TV' } }] }));
  return Promise.resolve(new Response('{}', { status: 404 }));
}

describe('beta public delivery regressions', () => {
  it('delivers the Inspector field choices and locale fallback to Stremio', async () => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: fixtureFetch }); apps.push(app);
    const configId = await create(app, {
      localization: { ...createDefaultMetaLayerConfig().localization, metadataLocale: 'pt-BR', metadataFallbackLocales: ['en-US'] },
      fieldProviders: { title: ['tmdb'], poster: ['fanart'], logo: ['fanart'], rating: ['imdb'] },
    });
    const inspection = await app.inject({ method: 'POST', url: `/api/v1/configurations/${configId}/inspect`, headers, payload: { id: 'tmdb:550' } });
    const response = await app.inject(`/c/${configId}/meta/movie/tmdb:550.json`);
    expect(response.statusCode).toBe(200);
    expect(response.json().meta).toMatchObject({ name: 'Fallback title', poster: 'https://art.test/poster.jpg', logo: 'https://art.test/logo.png', imdbRating: '9.1' });
    expect(response.json().meta.name).toBe(inspection.json().report.fields.displayTitle);
    expect(response.json().meta.poster).toBe(inspection.json().report.fields.poster.value);
  });

  it('does not silently restore an excluded artwork provider after its selected provider fails', async () => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: (url, init) => url.includes('fanart') ? Promise.resolve(new Response('{}', { status: 404 })) : fixtureFetch(url, init) }); apps.push(app);
    const id = await create(app, { fieldProviders: { poster: ['fanart'] } });
    const response = await app.inject(`/c/${id}/meta/movie/tmdb:550.json`);
    expect(response.statusCode).toBe(200);
    expect(response.json().meta.poster).toBeUndefined();
  });

  it.each(['anilist', 'mal', 'kitsu'])('opens %s cards using their returned type/id', async provider => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: fixtureFetch }); apps.push(app);
    const id = await create(app, { catalogs: [catalog(provider, 'anime')] });
    const manifest = (await app.inject(`/c/${id}/manifest.json`)).json();
    const entry = manifest.catalogs[0];
    const response = (await app.inject(`/c/${id}/catalog/${entry.type}/${entry.id}.json`)).json();
    expect(response.metas).toHaveLength(1);
    const card = response.metas[0];
    expect(manifest.idPrefixes).toContain(`${provider}:`);
    const meta = await app.inject(`/c/${id}/meta/${card.type}/${card.id}.json`);
    expect(meta.statusCode).toBe(200);
    expect(meta.json().meta.id).toBe(card.id);
  });

  it('keeps duplicate catalogs distinct and preserves the old public alias', async () => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: async () => json({ results: [
      { id: 1, title: 'Old', release_date: '1999-01-01' }, { id: 2, title: 'New', release_date: '2024-01-01' },
    ] }) }); apps.push(app);
    const source = catalog();
    const catalogs = duplicateCatalog([source], source.instanceId);
    catalogs[1]!.rules = { yearFrom: 2020 };
    const id = await create(app, { catalogs });
    const entries = (await app.inject(`/c/${id}/manifest.json`)).json().catalogs;
    expect(new Set(entries.map((entry: { id: string }) => entry.id)).size).toBe(2);
    const rows = await Promise.all(entries.map(async (entry: { id: string }) => (await app.inject(`/c/${id}/catalog/movie/${entry.id}.json`)).json().metas));
    expect(rows[0]).toHaveLength(2); expect(rows[1]).toHaveLength(1);
    expect((await app.inject(`/c/${id}/catalog/movie/tmdb.trending.json`)).json().metas).toHaveLength(2);
  });

  it('filters, sorts and paginates delivered results without repeating page one', async () => {
    const requested: number[] = [];
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: async input => {
      const page = Number(new URL(input).searchParams.get('page')); requested.push(page);
      return json({ results: page <= 3 ? Array.from({ length: 20 }, (_, index) => ({ id: (page - 1) * 20 + index + 1,
        title: `Title ${String(20 - index).padStart(2, '0')}`, release_date: index < 10 ? '1999-01-01' : '2024-01-01' })) : [] });
    } }); apps.push(app);
    const id = await create(app, { catalogs: [catalog()], globalRules: { yearFrom: 2020 }, globalSorting: { criteria: [{ field: 'title', direction: 'asc' }], stable: true } });
    const first = (await app.inject(`/c/${id}/catalog/movie/tmdb.trending.json`)).json().metas;
    const next = (await app.inject(`/c/${id}/catalog/movie/tmdb.trending/skip=20.json`)).json().metas;
    expect(first).toHaveLength(20); expect(next).toHaveLength(10);
    expect(first.every((item: { releaseInfo: string }) => item.releaseInfo.startsWith('2024'))).toBe(true);
    expect(first[0].name).toBe('Title 01');
    expect(next.some((item: { id: string }) => first.some((previous: { id: string }) => previous.id === item.id))).toBe(false);
    expect(requested).toContain(2); expect(requested).toContain(3);
  });

  it('preserves new global genre, rating and keyword rules in Studio and native delivery', async () => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: async () => json({ results: [
      { id: 1, title: 'Included', genre_ids: [27], vote_average: 8, overview: 'A haunted house' },
      { id: 2, title: 'Keyword excluded', genre_ids: [27], vote_average: 8, overview: 'A zombie story' },
      { id: 3, title: 'Genre excluded', genre_ids: [35], vote_average: 8 },
      { id: 4, title: 'Rating excluded', genre_ids: [27], vote_average: 3 },
    ] }) }); apps.push(app);
    const source = catalog();
    const id = await create(app, { catalogs: [source], globalRules: {
      includeGenres: ['Horror'], minimumRating: 7, excludeKeywords: ['zombie'], digitallyReleasedOnly: true,
    } });
    const native = (await app.inject(`/c/${id}/catalog/movie/tmdb.trending.json`)).json();
    const preview = (await app.inject({ method: 'POST',
      url: `/api/v1/configurations/${id}/catalogs/${source.instanceId}/preview`, headers, payload: {},
    })).json();
    expect(native.metas.map((meta: { name: string }) => meta.name)).toEqual(['Included']);
    expect(preview.metas.map((meta: { name: string }) => meta.name)).toEqual(['Included']);
    expect(native.warnings).toContainEqual({ code: 'RULE_DATA_UNAVAILABLE', params: { rule: 'digitallyReleasedOnly', provider: 'tmdb' } });
  });

  it('reports unsupported rule data instead of claiming the filter ran', async () => {
    const app = await buildApp({ logger: false, encryptionKey: key, providerFetch: async () => json({ results: [{ id: 550, title: 'Example' }] }) }); apps.push(app);
    const id = await create(app, { catalogs: [catalog()], globalRules: { hideWatched: true } });
    const response = (await app.inject(`/c/${id}/catalog/movie/tmdb.trending.json`)).json();
    expect(response.warnings).toContainEqual({ code: 'RULE_DATA_UNAVAILABLE', params: { rule: 'hideWatched', provider: 'tmdb' } });
  });
});

it('persists correction creation, moderation and deletion across SQLite restarts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'metalayer-corrections-'));
  const sqlitePath = join(dir, 'db.sqlite');
  let app = await buildApp({ logger: false, encryptionKey: key, sqlitePath, providerFetch: fixtureFetch });
  try {
    const id = await create(app);
    const response = await app.inject({ method: 'POST', url: `/api/v1/configurations/${id}/corrections`, headers, payload: {
      target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' }, type: 'title_correction',
      payload: { title: 'My corrected title' }, reason: 'Regression fixture',
    } });
    expect(response.statusCode).toBe(201);
    const correction = response.json().correction;
    await app.close();
    app = await buildApp({ logger: false, encryptionKey: key, sqlitePath, providerFetch: fixtureFetch });
    expect((await app.inject(`/c/${id}/meta/movie/tmdb:550.json`)).json().meta.name).toBe('My corrected title');
    const exported = await app.configStore.exportSafe(id);
    expect(exported!.localCorrections).toHaveLength(1);
    await app.inject({ method: 'PATCH', url: `/api/v1/configurations/${id}/corrections/${correction.id}`, headers, payload: { action: 'propose' } });
    await app.close();
    app = await buildApp({ logger: false, encryptionKey: key, sqlitePath });
    const listed = await app.inject({ url: `/api/v1/configurations/${id}/corrections`, headers });
    expect(listed.json().local[0]).toMatchObject({ status: 'proposed', createdAt: correction.createdAt });
    await app.inject({ method: 'DELETE', url: `/api/v1/configurations/${id}/corrections/${correction.id}`, headers });
    await app.close();
    app = await buildApp({ logger: false, encryptionKey: key, sqlitePath });
    expect((await app.inject({ url: `/api/v1/configurations/${id}/corrections`, headers })).json().local).toEqual([]);
  } finally { await app.close(); rmSync(dir, { recursive: true, force: true }); }
});

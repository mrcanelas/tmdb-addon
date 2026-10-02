import { describe, expect, it } from 'vitest';
import { AnilistProviderAdapter } from '../anilist/adapter.js';
import { MalJikanProviderAdapter } from '../mal/adapter.js';
import { KitsuProviderAdapter } from '../kitsu/adapter.js';
import { createProviderAdapter, listAdapterProviderIds } from '../factory.js';

describe('@metalayer/providers anime adapters', () => {
  it('wires anilist, mal, and kitsu in the factory', () => {
    expect(listAdapterProviderIds()).toEqual(
      expect.arrayContaining(['anilist', 'mal', 'kitsu']),
    );
    expect(createProviderAdapter('anilist')).toBeInstanceOf(AnilistProviderAdapter);
    expect(createProviderAdapter('mal')).toBeInstanceOf(MalJikanProviderAdapter);
    expect(createProviderAdapter('kitsu')).toBeInstanceOf(KitsuProviderAdapter);
  });

  it('loads AniList catalog pages via injectable fetch', async () => {
    const adapter = new AnilistProviderAdapter({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: {
              Page: {
                media: [
                  {
                    id: 5114,
                    idMal: 5114,
                    title: {
                      romaji: 'Hagane no Renkinjutsushi',
                      english: 'Fullmetal Alchemist: Brotherhood',
                    },
                    coverImage: { large: 'https://example.com/fma.jpg' },
                    format: 'TV',
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const items = await adapter.getCatalogPage(
      { correlationId: 'test' },
      { providerCatalogId: 'trending', mediaType: 'anime' },
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.publicId).toBe('anilist:5114');
    expect(items[0]!.mediaType).toBe('anime');
    expect(items[0]!.externalIds?.mal).toBe(5114);
  });

  it('loads MAL/Jikan catalog pages with configurable base URL', async () => {
    const adapter = new MalJikanProviderAdapter({
      baseUrl: 'https://jikan.example/v4',
      fetchImpl: async (url: string) => {
        expect(String(url)).toContain('jikan.example');
        return new Response(
          JSON.stringify({
            data: [
              {
                mal_id: 21,
                title: 'One Piece',
                type: 'TV',
                images: { jpg: { image_url: 'https://example.com/op.jpg' } },
              },
            ],
          }),
          { status: 200 },
        );
      },
    });

    const items = await adapter.getCatalogPage(
      { correlationId: 'test' },
      { providerCatalogId: 'popular', mediaType: 'anime' },
    );
    expect(items[0]!.publicId).toBe('mal:21');
    expect(items[0]!.format).toBe('tv');
  });

  it('loads Kitsu catalog pages', async () => {
    const adapter = new KitsuProviderAdapter({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: '1555',
                attributes: {
                  canonicalTitle: 'Fullmetal Alchemist: Brotherhood',
                  subtype: 'TV',
                  posterImage: { medium: 'https://example.com/kitsu.jpg' },
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const items = await adapter.getCatalogPage(
      { correlationId: 'test' },
      { providerCatalogId: 'top_rated', mediaType: 'anime' },
    );
    expect(items[0]!.publicId).toBe('kitsu:1555');
  });

  it('merges AniList streaming episodes with the paginated airing schedule', async () => {
    const pages: string[] = [];
    const adapter = new AnilistProviderAdapter({
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { variables: { page: number } };
        pages.push(String(body.variables.page));
        const first = body.variables.page === 1;
        return new Response(
          JSON.stringify({
            data: {
              Media: {
                episodes: 3,
                streamingEpisodes: first
                  ? [
                      { title: 'Episode 1 - Fullmetal Alchemist', thumbnail: 'https://img/1.jpg' },
                      { title: 'Episode 2 - The First Day', thumbnail: 'https://img/2.jpg' },
                    ]
                  : null,
                airingSchedule: {
                  pageInfo: { hasNextPage: first },
                  nodes: first
                    ? [{ episode: 1, airingAt: 1238889600 }]
                    : [{ episode: 2, airingAt: 1239494400 }],
                },
              },
            },
          }),
          { status: 200 },
        );
      },
    });

    const episodes = await adapter.getEpisodes({ correlationId: 'test' }, 5114);
    expect(pages).toEqual(['1', '2']);
    expect(episodes.map((episode) => episode.number)).toEqual([1, 2, 3]);
    expect(episodes[0]).toMatchObject({
      number: 1,
      title: 'Fullmetal Alchemist',
      thumbnailUrl: 'https://img/1.jpg',
      airDate: '2009-04-05T00:00:00.000Z',
    });
    // Declared count fills missing numbers so Stremio can still list them.
    expect(episodes[2]).toEqual({ number: 3 });
  });

  it('pages Jikan episodes until has_next_page is false', async () => {
    const urls: string[] = [];
    const adapter = new MalJikanProviderAdapter({
      baseUrl: 'https://jikan.test/v4',
      fetchImpl: async (url) => {
        urls.push(String(url));
        const page = Number(new URL(String(url)).searchParams.get('page'));
        return new Response(
          JSON.stringify({
            data: [{ mal_id: page, title: `Ep ${page}`, aired: '2009-04-05T00:00:00+00:00', filler: page === 2 }],
            pagination: { has_next_page: page < 2 },
          }),
          { status: 200 },
        );
      },
    });
    const episodes = await adapter.getEpisodes({ correlationId: 'test' }, 5114);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://jikan.test/v4/anime/5114/episodes?page=1');
    expect(episodes).toEqual([
      { number: 1, title: 'Ep 1', airDate: '2009-04-05T00:00:00+00:00', filler: false, recap: false },
      { number: 2, title: 'Ep 2', airDate: '2009-04-05T00:00:00+00:00', filler: true, recap: false },
    ]);
  });

  it('reads Kitsu episodes with JSON:API pagination', async () => {
    const adapter = new KitsuProviderAdapter({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                attributes: {
                  number: 1,
                  canonicalTitle: 'Fullmetal Alchemist',
                  airdate: '2009-04-05',
                  thumbnail: { original: 'https://img/k1.jpg' },
                  synopsis: 'Alchemy…',
                },
              },
            ],
            links: {},
          }),
          { status: 200 },
        ),
    });
    const episodes = await adapter.getEpisodes({ correlationId: 'test' }, 1555);
    expect(episodes).toEqual([
      {
        number: 1,
        title: 'Fullmetal Alchemist',
        airDate: '2009-04-05',
        thumbnailUrl: 'https://img/k1.jpg',
        overview: 'Alchemy…',
      },
    ]);
  });
});

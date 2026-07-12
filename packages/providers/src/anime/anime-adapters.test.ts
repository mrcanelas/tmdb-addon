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
});

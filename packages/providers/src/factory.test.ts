import { describe, expect, it } from 'vitest';
import { createProviderAdapter, listAdapterProviderIds } from './factory.js';

describe('@metalayer/providers factory', () => {
  it('creates concrete adapters for wired provider ids', () => {
    expect(listAdapterProviderIds()).toEqual(
      expect.arrayContaining(['tmdb', 'fanart', 'rpdb', 'imdb', 'anilist', 'mal', 'kitsu']),
    );
    expect(createProviderAdapter('tmdb')?.id).toBe('tmdb');
    expect(createProviderAdapter('anilist')?.id).toBe('anilist');
    expect(createProviderAdapter('mal')?.id).toBe('mal');
    expect(createProviderAdapter('kitsu')?.id).toBe('kitsu');
    expect(createProviderAdapter('unknown')).toBeNull();
    expect(createProviderAdapter('tvdb')).toBeNull();
  });
});

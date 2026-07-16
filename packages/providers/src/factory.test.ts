import { describe, expect, it } from 'vitest';
import { createProviderAdapter, listAdapterProviderIds } from './factory.js';

describe('@metalayer/providers factory', () => {
  it('creates concrete adapters for wired provider ids', () => {
    expect(listAdapterProviderIds()).toEqual(
      expect.arrayContaining([
        'tmdb',
        'fanart',
        'rpdb',
        'topposters',
        'aioratings',
        'openposterdb',
        'gemini',
        'groq',
        'openrouter',
        'imdb',
        'anilist',
        'mal',
        'kitsu',
        'trakt',
        'simkl',
        'publicmetadb',
      ]),
    );
    expect(createProviderAdapter('tmdb')?.id).toBe('tmdb');
    expect(createProviderAdapter('topposters')?.id).toBe('topposters');
    expect(createProviderAdapter('aioratings')?.id).toBe('aioratings');
    expect(createProviderAdapter('openposterdb')?.id).toBe('openposterdb');
    expect(createProviderAdapter('groq')?.id).toBe('groq');
    expect(createProviderAdapter('openrouter')?.id).toBe('openrouter');
    expect(createProviderAdapter('publicmetadb')?.id).toBe('publicmetadb');
    expect(createProviderAdapter('anilist')?.id).toBe('anilist');
    expect(createProviderAdapter('mal')?.id).toBe('mal');
    expect(createProviderAdapter('kitsu')?.id).toBe('kitsu');
    expect(createProviderAdapter('trakt')?.id).toBe('trakt');
    expect(createProviderAdapter('simkl')?.id).toBe('simkl');
    expect(createProviderAdapter('unknown')).toBeNull();
    expect(createProviderAdapter('tvdb')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { createProviderAdapter, listAdapterProviderIds } from './factory.js';

describe('@metalayer/providers factory', () => {
  it('creates concrete adapters for wired provider ids', () => {
    expect(listAdapterProviderIds()).toEqual(
      expect.arrayContaining(['tmdb', 'fanart', 'rpdb', 'imdb']),
    );
    expect(createProviderAdapter('tmdb')?.id).toBe('tmdb');
    expect(createProviderAdapter('fanart')?.id).toBe('fanart');
    expect(createProviderAdapter('unknown')).toBeNull();
    expect(createProviderAdapter('tvdb')).toBeNull();
  });
});

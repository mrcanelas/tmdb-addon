import { describe, expect, it } from 'vitest';
import {
  normalizeImdbId,
  parsePublicId,
  selectStremioPublicId,
  stremioIdPrefixes,
} from './public-id.js';

describe('@metalayer/identity public ids', () => {
  it('normalizes and prefers IMDb ids by default', () => {
    expect(normalizeImdbId('TT0137523')).toBe('tt0137523');
    expect(selectStremioPublicId({ imdbId: 'tt0137523', tmdbId: 550 })).toBe(
      'tt0137523',
    );
    expect(
      selectStremioPublicId({
        imdbId: null,
        tmdbId: 550,
        preference: 'imdb',
      }),
    ).toBe('tmdb:550');
    expect(
      selectStremioPublicId({
        imdbId: 'tt0137523',
        tmdbId: 550,
        preference: 'tmdb',
      }),
    ).toBe('tmdb:550');
  });

  it('parses tt and tmdb public ids', () => {
    expect(parsePublicId('tt0137523')).toEqual({
      kind: 'imdb',
      imdbId: 'tt0137523',
      raw: 'tt0137523',
    });
    expect(parsePublicId('tmdb:550')).toEqual({
      kind: 'tmdb',
      tmdbId: '550',
      raw: 'tmdb:550',
    });
    expect(stremioIdPrefixes('imdb')).toEqual(['tt', 'tmdb:']);
  });
});

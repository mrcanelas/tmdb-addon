import { describe, expect, it } from 'vitest';
import {
  isReleasedByDate,
  tmdbCatalogItemToMetaPreview,
  tmdbGenreNames,
  yearFromReleaseInfo,
} from './tmdb-catalog-meta.js';

describe('tmdb-catalog-meta helpers', () => {
  it('maps genre ids to English names', () => {
    expect(tmdbGenreNames([27, 18])).toEqual(['Horror', 'Drama']);
  });

  it('derives year and released from releaseInfo', () => {
    expect(yearFromReleaseInfo('2020-05-01')).toBe(2020);
    expect(isReleasedByDate('2099-01-01', new Date('2026-01-01'))).toBe(false);
    expect(isReleasedByDate('2020-01-01', new Date('2026-01-01'))).toBe(true);
  });

  it('builds CatalogMetaPreview fields for rule evaluation', () => {
    const meta = tmdbCatalogItemToMetaPreview(
      {
        id: 1,
        name: 'Sample',
        mediaType: 'movie',
        publicId: 'tt1',
        releaseDate: '2020-01-01',
        adult: false,
        genreIds: [27],
        overview: 'A horror night',
        voteAverage: 7.5,
        voteCount: 100,
        originalLanguage: 'en',
        posterPath: '/x.jpg',
      },
      'https://image.tmdb.org/t/p/w342/x.jpg',
      new Date('2026-01-01'),
    );
    expect(meta.genres).toEqual(['Horror']);
    expect(meta.rating).toBe(7.5);
    expect(meta.released).toBe(true);
    expect(meta.digitallyReleased).toBe(true);
    expect(meta.hasArtwork).toBe(true);
  });
});

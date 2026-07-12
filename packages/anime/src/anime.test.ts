import { describe, expect, it } from 'vitest';
import {
  FRIBB_FIXTURE,
  fribbRowsToProviderIds,
  mapAbsoluteToCour,
  mapCourToAbsolute,
  normalizeAnimeFormat,
  pickAnimeTitle,
} from './index.js';

describe('@metalayer/anime', () => {
  it('maps absolute numbering across split cours', () => {
    const mapping = mapAbsoluteToCour(13, [12, 12]);
    expect(mapping).toEqual({
      absoluteEpisode: 13,
      cour: 2,
      seasonNumber: 2,
      episodeInCour: 1,
    });
    expect(mapCourToAbsolute(2, 1, [12, 12])).toBe(13);
  });

  it('normalizes formats and picks anime titles independently', () => {
    expect(normalizeAnimeFormat('TV_SHORT')).toBe('tv');
    expect(normalizeAnimeFormat('OVA')).toBe('ova');
    expect(
      pickAnimeTitle(
        { native: '進撃の巨人', romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
        'english',
      ),
    ).toBe('Attack on Titan');
  });

  it('exposes Fribb fixture cross-ids for identity edges', () => {
    const row = FRIBB_FIXTURE[0]!;
    const ids = fribbRowsToProviderIds(row);
    expect(ids.mal).toBe(5114);
    expect(ids.anilist).toBe(5114);
    expect(ids.kitsu).toBe(1555);
    expect(ids.imdb).toBe('tt1226770');
  });
});

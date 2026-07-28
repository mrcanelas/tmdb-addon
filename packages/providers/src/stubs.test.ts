import { describe, expect, it } from 'vitest';
import {
  FanartArtworkAdapter,
  ImdbRatingsAdapter,
  RpdbArtworkAdapter,
  getProvider,
} from './index.js';

describe('@metalayer/providers artwork and ratings adapters', () => {
  it('registers IMDb and exposes runnable adapters', async () => {
    expect(getProvider('imdb')?.categories).toEqual(
      expect.arrayContaining(['metadata', 'artwork', 'ratings']),
    );

    const fanart = new FanartArtworkAdapter({
      fetchImpl: async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    await expect(fanart.ping({ correlationId: 'a' })).rejects.toMatchObject({
      code: 'auth',
    });

    expect(new RpdbArtworkAdapter().locale.supportsLocale('en-US')).toBe(false);

    const imdb = new ImdbRatingsAdapter({
      fetchImpl: async () =>
        new Response(JSON.stringify({ meta: { imdbRating: '8.8' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    await expect(imdb.ping({ correlationId: 'r' })).resolves.toMatchObject({
      state: 'healthy',
    });
  });
});

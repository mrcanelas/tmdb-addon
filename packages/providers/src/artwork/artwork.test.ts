import { describe, expect, it } from 'vitest';
import {
  artworkKindToPathSegment,
  buildRatedPosterUrl,
  RATED_POSTER_PROFILES,
  toRatedPosterLang,
} from './rated-poster.js';
import {
  AioRatingsArtworkAdapter,
  OpenPosterDbArtworkAdapter,
  RpdbArtworkAdapter,
  TopPostersArtworkAdapter,
} from './rpdb.js';
import { FanartArtworkAdapter } from './fanart.js';

describe('@metalayer/providers rated poster URL builder', () => {
  it('builds RPDB-compatible TMDB poster URLs with fallback and lang', () => {
    const url = buildRatedPosterUrl({
      profile: RATED_POSTER_PROFILES.rpdb,
      apiKey: 't0-test-key',
      mediaType: 'movie',
      tmdbId: 550,
      kind: 'poster',
      language: 'pt-BR',
    });
    expect(url).toBe(
      'https://api.ratingposterdb.com/t0-test-key/tmdb/poster-default/movie-550.png?fallback=true&lang=pt-BR',
    );
  });

  it('maps background to backdrop for OpenPosterDB and omits English lang', () => {
    expect(artworkKindToPathSegment('background', 'backdrop')).toBe(
      'backdrop-default',
    );
    const url = buildRatedPosterUrl({
      profile: RATED_POSTER_PROFILES.openposterdb,
      apiKey: 'opdb-key',
      mediaType: 'series',
      tmdbId: 1399,
      kind: 'background',
      language: 'en-US',
    });
    expect(url).toBe(
      'https://openposterdb.com/opdb-key/tmdb/backdrop-default/series-1399.jpg?fallback=true',
    );
  });

  it('builds Top Posters URLs without fallback and with full locale', () => {
    const url = buildRatedPosterUrl({
      profile: RATED_POSTER_PROFILES.topposters,
      apiKey: 'TP-abc',
      mediaType: 'movie',
      tmdbId: 155,
      language: 'pt-BR',
      extraParams: { style: 'rpdb' },
    });
    expect(url).toBe(
      'https://api.top-streaming.stream/TP-abc/tmdb/poster-default/movie-155.jpg?lang=pt-BR&style=rpdb',
    );
  });

  it('shortens non-special locales in RPDB lang mode', () => {
    expect(toRatedPosterLang('fr-FR', 'rpdb')).toBe('fr');
    expect(toRatedPosterLang('pt-BR', 'rpdb')).toBe('pt-BR');
    expect(toRatedPosterLang('fr-FR', 'full')).toBe('fr-FR');
  });
});

describe('@metalayer/providers artwork adapters', () => {
  it('fetches Fanart movie artwork through an injectable HTTP client', async () => {
    const urls: string[] = [];
    const adapter = new FanartArtworkAdapter({
      apiKey: 'fanart-key',
      fetchImpl: async (url) => {
        urls.push(String(url));
        expect(String(url)).toContain('api_key=fanart-key');
        return new Response(
          JSON.stringify({
            movieposter: [
              { url: 'https://assets.fanart.tv/poster-en.jpg', lang: 'en', likes: '10' },
              { url: 'https://assets.fanart.tv/poster-pt.jpg', lang: 'pt', likes: '3' },
            ],
            moviebackground: [
              { url: 'https://assets.fanart.tv/bg.jpg', lang: 'en', likes: '1' },
            ],
            hdmovielogo: [
              { url: 'https://assets.fanart.tv/logo.png', lang: 'pt', likes: '8' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const bundle = await adapter.getMovieArtwork(
      { correlationId: 'c1', locale: 'pt-BR' },
      550,
    );

    expect(bundle.identity).toBe('tmdb:movie:550');
    expect(bundle.assets[0]).toMatchObject({
      kind: 'poster',
      url: 'https://assets.fanart.tv/poster-pt.jpg',
      language: 'pt',
    });
    expect(bundle.assets.some((asset) => asset.kind === 'logo')).toBe(true);
    expect(adapter.getHealth().state).toBe('healthy');
    expect(urls[0]).toContain('/movies/550');
  });

  it('builds RPDB poster URLs and pings without exposing failures as success', async () => {
    const adapter = new RpdbArtworkAdapter({
      apiKey: 't0-test-key',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('/t0-test-key/tmdb/poster-default/movie-550.png');
        expect(String(url)).toContain('fallback=true');
        return new Response(null, { status: 200 });
      },
    });

    const health = await adapter.ping({ correlationId: 'c2' });
    expect(health.state).toBe('healthy');

    const bundle = adapter.getMovieArtwork(
      { correlationId: 'c2', locale: 'pt-BR', apiKey: 't0-test-key' },
      550,
      ['poster', 'logo'],
    );
    expect(bundle.assets).toHaveLength(2);
    expect(bundle.assets[0].url).toContain('lang=pt-BR');
    expect(bundle.assets[1].url).toContain('logo-default');
  });

  it('pings Top Posters via auth verify and builds jpg poster URLs', async () => {
    const adapter = new TopPostersArtworkAdapter({
      apiKey: 'TP-key',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('/auth/verify/TP-key');
        return new Response(JSON.stringify({ valid: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await expect(adapter.ping({ correlationId: 'tp' })).resolves.toMatchObject({
      state: 'healthy',
    });

    const series = adapter.getSeriesArtwork(
      { correlationId: 'tp', locale: 'pt-BR', apiKey: 'TP-key' },
      1399,
    );
    expect(series.identity).toBe('tmdb:series:1399');
    expect(series.assets[0].url).toContain(
      'api.top-streaming.stream/TP-key/tmdb/poster-default/series-1399.jpg',
    );
    expect(series.assets[0].url).toContain('lang=pt-BR');
    expect(series.assets[0].url).not.toContain('fallback=');
  });

  it('builds AIORatings and OpenPosterDB URLs from shared profiles', () => {
    const aio = new AioRatingsArtworkAdapter({ apiKey: 'aio-key' });
    const open = new OpenPosterDbArtworkAdapter({ apiKey: 'opdb-key' });

    expect(
      aio.getMovieArtwork({ correlationId: 'a', apiKey: 'aio-key' }, 550).assets[0]
        .url,
    ).toContain('api.aioratings.com/aio-key/tmdb/poster-default/movie-550.jpg');

    expect(
      open.getMovieArtwork({ correlationId: 'o', apiKey: 'opdb-key' }, 550, [
        'background',
      ]).assets[0].url,
    ).toContain(
      'openposterdb.com/opdb-key/tmdb/backdrop-default/movie-550.jpg?fallback=true',
    );
  });

  it('rejects missing artwork credentials as auth errors', async () => {
    await expect(
      new FanartArtworkAdapter().ping({ correlationId: 'x' }),
    ).rejects.toMatchObject({ code: 'auth' });
    await expect(
      new RpdbArtworkAdapter().ping({ correlationId: 'x' }),
    ).rejects.toMatchObject({ code: 'auth' });
    await expect(
      new TopPostersArtworkAdapter().ping({ correlationId: 'x' }),
    ).rejects.toMatchObject({ code: 'auth' });
  });
});

import { describe, expect, it } from 'vitest';
import { FanartArtworkAdapter } from './fanart.js';
import { RpdbArtworkAdapter } from './rpdb.js';

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

  it('rejects missing artwork credentials as auth errors', async () => {
    await expect(
      new FanartArtworkAdapter().ping({ correlationId: 'x' }),
    ).rejects.toMatchObject({ code: 'auth' });
    await expect(
      new RpdbArtworkAdapter().ping({ correlationId: 'x' }),
    ).rejects.toMatchObject({ code: 'auth' });
  });
});

import { describe, expect, it } from 'vitest';
import { TmdbProviderAdapter } from './tmdb/adapter.js';

describe('@metalayer/providers tmdb adapter', () => {
  it('fetches TMDB movie details through an injectable HTTP client', async () => {
    const calls: string[] = [];
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        calls.push(url);
        expect(url).toContain('api_key=test-key');
        expect(url).toContain('language=pt-BR');
        expect(url).toContain('region=BR');
        return new Response(
          JSON.stringify({
            id: 550,
            title: 'Clube da Luta',
            original_title: 'Fight Club',
            overview: 'Um homem insone...',
            release_date: '1999-10-15',
            poster_path: '/poster.jpg',
            vote_average: 8.4,
            original_language: 'en',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const movie = await adapter.getMovie(
      { correlationId: 'corr-1', locale: 'pt-BR', region: 'BR' },
      550,
    );

    expect(movie).toMatchObject({
      id: 550,
      title: 'Clube da Luta',
      originalTitle: 'Fight Club',
    });
    expect(adapter.getHealth().state).toBe('healthy');
    expect(calls).toHaveLength(1);
  });

  it('classifies missing TMDB credentials as non-retryable auth errors', async () => {
    const adapter = new TmdbProviderAdapter({
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });

    await expect(
      adapter.ping({ correlationId: 'corr-2' }),
    ).rejects.toMatchObject({ code: 'auth', retryable: false });
  });
});

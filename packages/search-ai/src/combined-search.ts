import type { CombinedSearchResult, SearchHit, SearchMode } from './types.js';

/**
 * Merge provider search hits: dedupe by external id / title+year, preserve provider diversity.
 */
export function combineSearchHits(
  query: string,
  providerHits: Array<{ provider: string; hits: SearchHit[] }>,
  mode: SearchMode = 'combined',
): CombinedSearchResult {
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  const warnings: string[] = [];
  const providers: string[] = [];

  for (const group of providerHits) {
    providers.push(group.provider);
    for (const hit of group.hits) {
      const key = hitKey(hit);
      if (seen.has(key)) {
        warnings.push(`Duplicate dropped: ${hit.title} (${hit.provider})`);
        continue;
      }
      seen.add(key);
      hits.push({ ...hit, provider: hit.provider || group.provider });
    }
  }

  hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    query: query.trim(),
    mode,
    hits,
    providers: [...new Set(providers)],
    warnings,
  };
}

function hitKey(hit: SearchHit): string {
  const imdb = hit.externalIds?.imdb;
  const tmdb = hit.externalIds?.tmdb;
  if (imdb) return `imdb:${String(imdb).toLowerCase()}`;
  if (tmdb) return `tmdb:${hit.mediaType}:${tmdb}`;
  return `${hit.mediaType}:${hit.title.toLowerCase()}:${hit.year ?? ''}`;
}

/** Fixture provider search used when live adapters are unavailable. */
export function fixtureSearchHits(query: string): SearchHit[] {
  const q = query.toLowerCase();
  const catalog: SearchHit[] = [
    {
      id: 'tt0137523',
      title: 'Fight Club',
      mediaType: 'movie',
      year: 1999,
      provider: 'tmdb',
      externalIds: { imdb: 'tt0137523', tmdb: 550 },
      score: 0.95,
    },
    {
      id: 'tt0111161',
      title: 'The Shawshank Redemption',
      mediaType: 'movie',
      year: 1994,
      provider: 'tmdb',
      externalIds: { imdb: 'tt0111161', tmdb: 278 },
      score: 0.94,
    },
    {
      id: 'tt0903747',
      title: 'Breaking Bad',
      mediaType: 'series',
      year: 2008,
      provider: 'tvdb',
      externalIds: { imdb: 'tt0903747', tvdb: 81189 },
      score: 0.93,
    },
  ];

  return catalog.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      q.split(/\s+/).some((part) => part.length > 2 && item.title.toLowerCase().includes(part)),
  );
}

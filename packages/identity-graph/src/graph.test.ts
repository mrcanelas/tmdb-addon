import { describe, expect, it } from 'vitest';
import { MemoryCache } from '@metalayer/cache';
import {
  buildEdgesFromProviderIds,
  buildIdentityDiagnostics,
  createCanonicalId,
  IdentityMappingCache,
  parseCanonicalId,
  precedenceScore,
  resolveIdentityMapping,
} from './index.js';

describe('@metalayer/identity-graph', () => {
  it('creates parseable canonical metalayer ids', () => {
    const canonical = createCanonicalId('movie', '01TESTCANONICAL00000001');
    expect(canonical.id).toBe('metalayer:movie:01TESTCANONICAL00000001');
    expect(parseCanonicalId(canonical.id)?.entityKind).toBe('movie');
  });

  it('builds bidirectional provider edges from TMDB+IMDb', () => {
    const edges = buildEdgesFromProviderIds(
      { tmdb: 550, imdb: 'tt0137523' },
      { entityKind: 'movie', now: new Date('2026-01-01T00:00:00.000Z') },
    );
    expect(edges.length).toBe(2);
    expect(edges[0]!.method).toBe('provider');
    expect(edges[0]!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(edges[0]!.evidence[0]!.summary).toContain('tmdb:550');
  });

  it('resolves mappings with observable provenance and diagnostics', () => {
    const mapping = resolveIdentityMapping({
      ids: { tmdb: 550, imdb: 'tt0137523' },
      entityKind: 'movie',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(mapping.canonical.id.startsWith('metalayer:movie:')).toBe(true);
    expect(mapping.matches.map((item) => item.provider).sort()).toEqual([
      'imdb',
      'tmdb',
    ]);
    expect(mapping.edges.length).toBeGreaterThan(0);
    expect(mapping.selectedByProvider.imdb?.method).toBe('provider');

    const diagnostics = buildIdentityDiagnostics(mapping, precedenceScore);
    expect(diagnostics.canonicalId).toBe(mapping.canonical.id);
    expect(diagnostics.matches).toEqual(
      expect.arrayContaining([
        { provider: 'tmdb', id: '550' },
        { provider: 'imdb', id: 'tt0137523' },
      ]),
    );
    expect(diagnostics.edgeCount).toBe(mapping.edges.length);
    expect(diagnostics.unresolvedProviders).toContain('tvdb');
  });

  it('lets verified manual corrections outrank provider edges', () => {
    const providerEdges = buildEdgesFromProviderIds({
      tmdb: 550,
      imdb: 'tt0137523',
    });
    const now = new Date('2026-01-01T00:00:00.000Z');
    const correction = {
      source: { provider: 'tmdb' as const, id: '550', entityKind: 'movie' as const },
      target: { provider: 'imdb' as const, id: 'tt9999999', entityKind: 'movie' as const },
      confidence: 1,
      method: 'manual' as const,
      verified: true,
      evidence: [
        {
          kind: 'manual-note' as const,
          summary: 'Local correction overrides wrong IMDb',
          observedAt: now.toISOString(),
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const mapping = resolveIdentityMapping({
      ids: { tmdb: 550, imdb: 'tt9999999' },
      edges: providerEdges,
      corrections: [{ edge: correction }],
    });

    expect(precedenceScore(correction)).toBeGreaterThan(
      precedenceScore(providerEdges[0]!),
    );
    expect(mapping.selectedByProvider.imdb?.method).toBe('manual');
    expect(mapping.selectedByProvider.imdb?.verified).toBe(true);
  });

  it('does not let low-confidence heuristic edges override provider matches', () => {
    const providerEdges = buildEdgesFromProviderIds({
      tmdb: 550,
      imdb: 'tt0137523',
    });
    const heuristic = {
      ...providerEdges[0]!,
      method: 'heuristic' as const,
      confidence: 0.4,
      verified: false,
      target: { provider: 'imdb' as const, id: 'tt0000001', entityKind: 'movie' as const },
    };

    const mapping = resolveIdentityMapping({
      ids: { tmdb: 550, imdb: 'tt0137523' },
      edges: [...providerEdges, heuristic],
    });

    expect(mapping.selectedByProvider.imdb?.target.id).toBe('tt0137523');
    expect(mapping.selectedByProvider.imdb?.method).toBe('provider');
  });

  it('caches resolved mappings by provider id', async () => {
    const store = new MemoryCache();
    const cache = new IdentityMappingCache(store);
    const mapping = resolveIdentityMapping({
      ids: { tmdb: 550, imdb: 'tt0137523' },
    });
    await cache.set(mapping);
    const hit = await cache.get('imdb', 'tt0137523');
    expect(hit?.canonical.id).toBe(mapping.canonical.id);
    expect(hit?.matches).toHaveLength(2);
  });

  it('builds anime work mappings from MAL/AniList/Kitsu ids', () => {
    const mapping = resolveIdentityMapping({
      ids: { mal: 5114, anilist: 5114, kitsu: 1555 },
      entityKind: 'work',
    });
    expect(mapping.canonical.id.startsWith('metalayer:work:')).toBe(true);
    expect(mapping.matches.map((item) => item.provider).sort()).toEqual([
      'anilist',
      'kitsu',
      'mal',
    ]);
    expect(mapping.edges.length).toBeGreaterThan(0);
  });
});

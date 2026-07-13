import { describe, expect, it } from 'vitest';
import { RuleSetSchema } from '@metalayer/config';
import {
  FixtureAiProvider,
  applyConfirmedProposal,
  assertProposalConfirmation,
  combineSearchHits,
  createRankedListCatalogProposal,
  fixtureSearchHits,
  parseDiscoveryPrompt,
  ProposalConfirmationRequiredError,
  resolveRankedList,
  runSmartDiscovery,
  sanitizeAiContext,
  validateDiscoveryPlan,
} from './index.js';

describe('@metalayer/search-ai', () => {
  it('parses Smart Discovery prompts into validated RuleSet-compatible plans', () => {
    const plan = parseDiscoveryPrompt(
      'Investigation movies without horror and under two hours.',
    );
    expect(plan.mediaType).toBe('movie');
    expect(plan.includeGenres).toEqual(
      expect.arrayContaining(['Mystery', 'Crime']),
    );
    expect(plan.excludeGenres).toContain('Horror');
    expect(plan.runtimeMax).toBe(120);

    const validated = validateDiscoveryPlan(plan);
    expect(validated.ok).toBe(true);
    expect(RuleSetSchema.safeParse({
      includeGenres: plan.includeGenres,
      excludeGenres: plan.excludeGenres,
      runtimeMax: plan.runtimeMax,
    }).success).toBe(true);
  });

  it('combines provider search hits and dedupes', () => {
    const combined = combineSearchHits('fight', [
      { provider: 'tmdb', hits: fixtureSearchHits('fight') },
      {
        provider: 'tvdb',
        hits: [
          {
            id: 'tt0137523',
            title: 'Fight Club',
            mediaType: 'movie',
            year: 1999,
            provider: 'tvdb',
            externalIds: { imdb: 'tt0137523' },
            score: 0.9,
          },
        ],
      },
    ]);
    expect(combined.hits).toHaveLength(1);
    expect(combined.warnings.some((w) => w.code === 'DUPLICATE_DROPPED')).toBe(true);
  });

  it('resolves ranked lists with duplicates and unresolved titles', () => {
    const result = resolveRankedList({
      prompt: 'Best science-fiction movies of all time.',
      candidates: [
        {
          rank: 1,
          title: 'Blade Runner',
          year: 1982,
          externalIds: { imdb: 'tt0083658', tmdb: 78 },
        },
        {
          rank: 2,
          title: 'Blade Runner',
          year: 1982,
          externalIds: { imdb: 'tt0083658', tmdb: 78 },
        },
        { rank: 3, title: 'Unknown Nebula', year: 2024 },
      ],
    });
    expect(result.duplicates).toHaveLength(1);
    expect(result.unresolved.map((item) => item.title)).toContain('Unknown Nebula');
    expect(result.items[0]!.resolved).toBe(true);
  });

  it('redacts secrets and refuses unconfirmed AI proposal apply', async () => {
    const sanitized = sanitizeAiContext({
      prompt: 'Find movies key=sk-abcdefghijklmnopqrstuv',
      secrets: { tmdb: 'secret-tmdb-key' },
    });
    expect(sanitized.prompt).toContain('[REDACTED]');
    expect(sanitized.prompt).not.toContain('sk-abcdefghijklmnopqrstuv');

    const discovery = await runSmartDiscovery({
      prompt: 'Investigation movies without horror and under two hours.',
      ai: new FixtureAiProvider(),
      secrets: { gemini: 'should-not-leak' },
    });
    expect(discovery.plan.runtimeMax).toBe(120);
    expect(discovery.proposal.kind).toBe('smart-discovery-rules');

    expect(() => assertProposalConfirmation(false)).toThrow(
      ProposalConfirmationRequiredError,
    );
    assertProposalConfirmation(true);

    const rankedProposal = createRankedListCatalogProposal(
      resolveRankedList({
        prompt: 'Best science-fiction movies of all time.',
        candidates: [
          {
            rank: 1,
            title: 'The Matrix',
            year: 1999,
            externalIds: { imdb: 'tt0133093', tmdb: 603 },
          },
        ],
      }),
    );
    const applied = applyConfirmedProposal(rankedProposal, [], {});
    expect(applied.catalogs).toHaveLength(1);
    expect(applied.catalogs[0]!.providerCatalogId).toBe('ai.ranked-list');
    expect(applied.catalogs[0]!.tags).toContain('ai');
  });
});

import { resolveIdentityMapping } from '@metalayer/identity-graph';
import type {
  MediaType,
  RankedListCandidate,
  RankedListResult,
  ResolvedRankedItem,
  SearchAiNotice,
} from './types.js';
import { buildExplanation } from './explain.js';
import { discoveryPlanToRuleSet, parseDiscoveryPrompt } from './discovery.js';

export interface ResolveRankedListInput {
  prompt: string;
  mediaType?: MediaType;
  candidates: RankedListCandidate[];
  /** Optional expected media type override for validation. */
  expectedMediaType?: MediaType;
}

/**
 * Resolve ranked AI candidates through identity + type/year validation.
 * AI output never becomes a catalog without this step and user confirmation.
 */
export function resolveRankedList(input: ResolveRankedListInput): RankedListResult {
  const mediaType =
    input.mediaType ??
    input.expectedMediaType ??
    detectFromPrompt(input.prompt);
  const items: ResolvedRankedItem[] = [];
  const byIdentity = new Map<string, number>();

  const ordered = [...input.candidates].sort((a, b) => a.rank - b.rank);

  for (const candidate of ordered) {
    const warnings: SearchAiNotice[] = [];
    const candidateType = candidate.mediaType ?? mediaType;
    if (candidate.mediaType && candidate.mediaType !== mediaType) {
      warnings.push({
        code: 'TYPE_MISMATCH',
        params: {
          candidateType: candidate.mediaType,
          expectedType: mediaType,
        },
      });
    }

    const externalIds = { ...(candidate.externalIds ?? {}) };
    let canonicalId: string | null = null;
    let resolved = false;

    if (Object.keys(externalIds).length > 0 || candidate.title) {
      const mapping = resolveIdentityMapping({
        ids: {
          tmdb: externalIds.tmdb as number | string | undefined,
          imdb: externalIds.imdb as string | undefined,
          tvdb: externalIds.tvdb as number | string | undefined,
        },
        entityKind: candidateType === 'movie' ? 'movie' : 'series',
      });
      canonicalId = mapping.canonical.id;
      resolved = mapping.matches.length > 0;

      if (!resolved && !externalIds.imdb && !externalIds.tmdb) {
        // Title-only candidates remain unresolved until identity is known.
        canonicalId = null;
        warnings.push({ code: 'NO_EXTERNAL_IDS' });
      } else if (resolved) {
        for (const match of mapping.matches) {
          externalIds[match.provider] = match.id;
        }
      }
    }

    if (candidate.year !== undefined && (candidate.year < 1888 || candidate.year > 2100)) {
      warnings.push({
        code: 'SUSPICIOUS_YEAR',
        params: { year: candidate.year },
      });
    }

    const identityKey =
      (externalIds.imdb && `imdb:${externalIds.imdb}`) ||
      (externalIds.tmdb && `tmdb:${externalIds.tmdb}`) ||
      `title:${candidate.title.toLowerCase()}:${candidate.year ?? ''}`;

    let duplicateOfRank: number | undefined;
    if (byIdentity.has(identityKey)) {
      duplicateOfRank = byIdentity.get(identityKey);
      warnings.push({
        code: 'DUPLICATE_OF_RANK',
        params: { rank: duplicateOfRank },
      });
    } else {
      byIdentity.set(identityKey, candidate.rank);
    }

    items.push({
      rank: candidate.rank,
      title: candidate.title,
      year: candidate.year,
      mediaType: candidateType,
      resolved,
      canonicalId,
      externalIds,
      duplicateOfRank,
      warnings,
    });
  }

  const unresolved = items.filter((item) => !item.resolved);
  const duplicates = items.filter((item) => item.duplicateOfRank !== undefined);
  const plan = parseDiscoveryPrompt(input.prompt);

  return {
    prompt: input.prompt,
    mediaType,
    items,
    unresolved,
    duplicates,
    explanation: buildExplanation({
      interpretedIntent: {
        code: 'RANKED_LIST_INTENT',
        params: { mediaType, prompt: input.prompt },
      },
      generatedRules: discoveryPlanToRuleSet(plan),
      providerSelection: ['identity-graph', 'fixture-ai'],
      unresolvedItems: unresolved.map((item) => item.title),
      assumptions: plan.assumptions,
      warnings: [...plan.warnings, ...items.flatMap((item) => item.warnings)],
    }),
  };
}

function detectFromPrompt(prompt: string): MediaType {
  const lower = prompt.toLowerCase();
  if (/\banime\b/.test(lower)) return 'anime';
  if (/\b(series|tv)\b/.test(lower)) return 'series';
  return 'movie';
}

/** Built-in ranked candidates for demos / offline tests. */
export function fixtureRankedCandidates(prompt: string): RankedListCandidate[] {
  const lower = prompt.toLowerCase();
  if (/science.?fiction|sci-?fi/.test(lower)) {
    return [
      {
        rank: 1,
        title: '2001: A Space Odyssey',
        year: 1968,
        mediaType: 'movie',
        externalIds: { imdb: 'tt0062622', tmdb: 62 },
      },
      {
        rank: 2,
        title: 'Blade Runner',
        year: 1982,
        mediaType: 'movie',
        externalIds: { imdb: 'tt0083658', tmdb: 78 },
      },
      {
        rank: 3,
        title: 'The Matrix',
        year: 1999,
        mediaType: 'movie',
        externalIds: { imdb: 'tt0133093', tmdb: 603 },
      },
      {
        rank: 4,
        title: 'Blade Runner',
        year: 1982,
        mediaType: 'movie',
        externalIds: { imdb: 'tt0083658', tmdb: 78 },
      },
      {
        rank: 5,
        title: 'Unknown Nebula',
        year: 2024,
        mediaType: 'movie',
      },
    ];
  }

  return [
    {
      rank: 1,
      title: 'Fight Club',
      year: 1999,
      mediaType: 'movie',
      externalIds: { imdb: 'tt0137523', tmdb: 550 },
    },
    {
      rank: 2,
      title: 'The Shawshank Redemption',
      year: 1994,
      mediaType: 'movie',
      externalIds: { imdb: 'tt0111161', tmdb: 278 },
    },
  ];
}

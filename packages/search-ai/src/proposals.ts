import { createCatalogInstance } from '@metalayer/catalogs';
import type { CatalogDefinition, RuleSet, StaticCatalogItem } from '@metalayer/config';
import type {
  AiProposal,
  AiProposalKind,
  DiscoveryPlan,
  RankedListResult,
  ResolvedRankedItem,
} from './types.js';
import { buildExplanation } from './explain.js';
import { discoveryPlanToRuleSet } from './discovery.js';

function proposalId(): string {
  return `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSmartDiscoveryProposal(
  plan: DiscoveryPlan,
  now = new Date(),
): AiProposal {
  const rules = discoveryPlanToRuleSet(plan);
  return {
    id: proposalId(),
    kind: 'smart-discovery-rules',
    summary: {
      code: 'SMART_DISCOVERY_SUMMARY',
      params: { prompt: plan.rawPrompt },
    },
    explanation: buildExplanation({
      interpretedIntent: {
        code: 'DISCOVERY_PROMPT_INTENT',
        params: { prompt: plan.rawPrompt },
      },
      generatedRules: rules,
      providerSelection: ['heuristic-discovery'],
      assumptions: plan.assumptions,
      warnings: plan.warnings,
    }),
    rulesDraft: rules,
    createdAt: now.toISOString(),
  };
}

/** Public Stremio id for a resolved ranked item (IMDb preferred, then TMDB). */
export function rankedItemPublicId(item: ResolvedRankedItem): string | undefined {
  const imdb = item.externalIds.imdb;
  if (typeof imdb === 'string' && /^tt\d+$/.test(imdb)) return imdb;
  const tmdb = item.externalIds.tmdb;
  if (tmdb !== undefined && tmdb !== '') return `tmdb:${tmdb}`;
  const anilist = item.externalIds.anilist;
  if (anilist !== undefined && anilist !== '') return `anilist:${anilist}`;
  return undefined;
}

/** Materialize resolved, non-duplicate ranked items in rank order (AGENTS.md §16.3). */
export function rankedListToStaticItems(result: RankedListResult): StaticCatalogItem[] {
  return [...result.items]
    .filter((item) => item.resolved && item.duplicateOfRank === undefined)
    .sort((a, b) => a.rank - b.rank)
    .flatMap((item) => {
      const id = rankedItemPublicId(item);
      if (!id) return [];
      return [
        {
          type: item.mediaType,
          id,
          name: item.title,
          ...(item.year !== undefined ? { year: item.year } : {}),
        },
      ];
    });
}

export function createRankedListCatalogProposal(
  result: RankedListResult,
  name?: string,
  now = new Date(),
): AiProposal {
  const staticItems = rankedListToStaticItems(result);

  return {
    id: proposalId(),
    kind: 'ranked-list-catalog',
    summary: {
      code: 'RANKED_LIST_SUMMARY',
      params: { count: staticItems.length },
    },
    explanation: result.explanation,
    catalogDraft: {
      provider: 'metalayer',
      providerCatalogId: 'ai.ranked-list',
      mediaType: result.mediaType,
      originalName: name ?? `AI: ${result.prompt.slice(0, 48)}`,
      customName: name,
      tags: ['ai', 'ranked-list'],
      staticItems,
    },
    createdAt: now.toISOString(),
  };
}

/**
 * Apply a confirmed proposal into catalog/rules drafts.
 * Callers must pass confirm=true via assertProposalConfirmation first.
 */
export function applyConfirmedProposal(
  proposal: AiProposal,
  existingCatalogs: CatalogDefinition[],
  existingRules: RuleSet,
): {
  catalogs: CatalogDefinition[];
  globalRules: RuleSet;
  applied: AiProposalKind;
} {
  if (proposal.kind === 'ranked-list-catalog' && proposal.catalogDraft) {
    const next = createCatalogInstance(proposal.catalogDraft, existingCatalogs);
    return {
      catalogs: [...existingCatalogs, next],
      globalRules: existingRules,
      applied: proposal.kind,
    };
  }

  if (proposal.kind === 'smart-discovery-rules' && proposal.rulesDraft) {
    return {
      catalogs: existingCatalogs,
      globalRules: { ...existingRules, ...proposal.rulesDraft },
      applied: proposal.kind,
    };
  }

  throw new Error(`Proposal ${proposal.id} has nothing to apply`);
}

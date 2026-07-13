export type {
  SearchMode,
  MediaType,
  SearchAiNotice,
  SearchHit,
  CombinedSearchResult,
  DiscoverySortCriterion,
  DiscoveryPlan,
  RankedListCandidate,
  ResolvedRankedItem,
  RankedListResult,
  AiExplanation,
  AiProposalKind,
  AiProposal,
  AiProviderPort,
  SanitizeAiContextInput,
} from './types.js';

export {
  parseDiscoveryPrompt,
  discoveryPlanToRuleSet,
  validateDiscoveryPlan,
} from './discovery.js';

export { combineSearchHits, fixtureSearchHits } from './combined-search.js';

export {
  resolveRankedList,
  fixtureRankedCandidates,
} from './ranked-list.js';

export { buildExplanation } from './explain.js';

export {
  sanitizeAiContext,
  assertProposalConfirmation,
  ProposalConfirmationRequiredError,
} from './safety.js';

export {
  createSmartDiscoveryProposal,
  createRankedListCatalogProposal,
  applyConfirmedProposal,
} from './proposals.js';

export { FixtureAiProvider } from './fixture-ai.js';
export { runSmartDiscovery } from './smart-discovery.js';

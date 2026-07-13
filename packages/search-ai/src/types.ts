import type { CatalogDefinition, RuleSet } from '@metalayer/config';

export type SearchMode =
  | 'provider'
  | 'combined'
  | 'person'
  | 'company'
  | 'network'
  | 'collection'
  | 'smart-discovery'
  | 'ranked-list';

export type MediaType = 'movie' | 'series' | 'anime';

/** Stable notice for UI translation (AGENTS.md §9.11 / Phase M i18n). */
export interface SearchAiNotice {
  code: string;
  params?: Record<string, string | number | undefined>;
}

export interface SearchHit {
  id: string;
  title: string;
  mediaType: MediaType;
  year?: number;
  provider: string;
  externalIds?: Record<string, string | number>;
  score?: number;
}

export interface CombinedSearchResult {
  query: string;
  mode: SearchMode;
  hits: SearchHit[];
  providers: string[];
  warnings: SearchAiNotice[];
}

export interface DiscoverySortCriterion {
  field: 'popularity' | 'rating' | 'releaseDate' | 'title' | 'runtime';
  direction: 'asc' | 'desc';
}

/** Structured Smart Discovery plan — always validated before use. */
export interface DiscoveryPlan {
  mediaType: MediaType;
  includeGenres?: string[];
  excludeGenres?: string[];
  requireGenres?: string[];
  runtimeMax?: number;
  runtimeMin?: number;
  yearFrom?: number;
  yearTo?: number;
  minimumRating?: number;
  sort: DiscoverySortCriterion[];
  rawPrompt: string;
  assumptions: SearchAiNotice[];
  warnings: SearchAiNotice[];
}

export interface RankedListCandidate {
  rank: number;
  title: string;
  year?: number;
  mediaType?: MediaType;
  externalIds?: Record<string, string | number>;
}

export interface ResolvedRankedItem {
  rank: number;
  title: string;
  year?: number;
  mediaType: MediaType;
  resolved: boolean;
  canonicalId: string | null;
  externalIds: Record<string, string | number>;
  duplicateOfRank?: number;
  warnings: SearchAiNotice[];
}

export interface RankedListResult {
  prompt: string;
  mediaType: MediaType;
  items: ResolvedRankedItem[];
  unresolved: ResolvedRankedItem[];
  duplicates: ResolvedRankedItem[];
  explanation: AiExplanation;
}

export interface AiExplanation {
  interpretedIntent: SearchAiNotice;
  generatedRules: RuleSet;
  providerSelection: string[];
  unresolvedItems: string[];
  assumptions: SearchAiNotice[];
  warnings: SearchAiNotice[];
}

export type AiProposalKind =
  | 'smart-discovery-rules'
  | 'ranked-list-catalog'
  | 'assistant-config';

/** Diff-style proposal — never applied without explicit confirmation. */
export interface AiProposal {
  id: string;
  kind: AiProposalKind;
  summary: string;
  explanation: AiExplanation;
  /** Suggested catalog definition when kind is ranked-list-catalog. */
  catalogDraft?: Omit<
    CatalogDefinition,
    'instanceId' | 'position' | 'enabled' | 'showInHome' | 'tags'
  > & {
    instanceId?: string;
    position?: number;
    enabled?: boolean;
    showInHome?: boolean;
    tags?: string[];
  };
  /** Suggested global/catalog rules when kind is smart-discovery-rules. */
  rulesDraft?: RuleSet;
  createdAt: string;
}

export interface AiProviderPort {
  id: string;
  /**
   * Generate a discovery plan from natural language.
   * Implementations must never receive secrets or full configuration.
   */
  proposeDiscoveryPlan(prompt: string): Promise<Partial<DiscoveryPlan> | null>;
  proposeRankedCandidates(
    prompt: string,
    mediaType: MediaType,
  ): Promise<RankedListCandidate[]>;
}

export interface SanitizeAiContextInput {
  prompt: string;
  /** Anything resembling secrets must be stripped before AI calls. */
  secrets?: Record<string, string | undefined>;
  configSnippet?: unknown;
}

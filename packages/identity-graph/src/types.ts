/** Entity kinds modeled by the Identity Graph (AGENTS.md §18.2). */
export type IdentityEntityKind =
  | 'work'
  | 'movie'
  | 'series'
  | 'season'
  | 'cour'
  | 'episode'
  | 'special'
  | 'edition'
  | 'collection'
  | 'franchise';

/** Supported external identity systems (AGENTS.md §18.3). */
export type IdentityProvider =
  | 'metalayer'
  | 'tmdb'
  | 'tvdb'
  | 'imdb'
  | 'trakt'
  | 'tvmaze'
  | 'mal'
  | 'anilist'
  | 'kitsu'
  | 'anidb'
  | 'simkl';

export type IdentityMatchMethod =
  | 'provider'
  | 'dataset'
  | 'exact-match'
  | 'heuristic'
  | 'community'
  | 'manual';

export interface ExternalIdentity {
  provider: IdentityProvider;
  id: string;
  entityKind?: IdentityEntityKind;
}

export interface IdentityEvidence {
  kind: 'provider-response' | 'dataset-row' | 'exact-id' | 'manual-note' | 'heuristic';
  summary: string;
  source?: string;
  observedAt?: string;
}

export interface IdentityEdge {
  source: ExternalIdentity;
  target: ExternalIdentity;
  confidence: number;
  method: IdentityMatchMethod;
  verified: boolean;
  evidence: IdentityEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalIdentity {
  /** e.g. metalayer:movie:01H… */
  id: string;
  entityKind: IdentityEntityKind;
  createdAt: string;
}

/**
 * Mapping precedence (AGENTS.md §18.6) — higher wins.
 * Local/community corrections feed verified-local / verified-community via Phase J bridge.
 */
export const MAPPING_PRECEDENCE: Record<IdentityMatchMethod | 'verified-local' | 'verified-community', number> = {
  'verified-local': 100,
  'verified-community': 90,
  provider: 80,
  dataset: 70,
  'exact-match': 60,
  heuristic: 40,
  community: 50,
  manual: 85,
};

export function precedenceScore(edge: IdentityEdge): number {
  if (edge.verified && edge.method === 'manual') {
    return MAPPING_PRECEDENCE['verified-local'];
  }
  if (edge.verified && edge.method === 'community') {
    return MAPPING_PRECEDENCE['verified-community'];
  }
  const base = MAPPING_PRECEDENCE[edge.method] ?? 0;
  return base + edge.confidence * 10;
}

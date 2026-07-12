import type {
  ExternalIdentity,
  IdentityEdge,
  IdentityEntityKind,
  IdentityEvidence,
  IdentityMatchMethod,
  IdentityProvider,
} from './types.js';

export interface ProviderIdBag {
  tmdb?: string | number | null;
  imdb?: string | null;
  tvdb?: string | number | null;
  trakt?: string | number | null;
  mal?: string | number | null;
  anilist?: string | number | null;
  kitsu?: string | number | null;
  anidb?: string | number | null;
  simkl?: string | number | null;
  tvmaze?: string | number | null;
}

function asId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim();
}

function node(
  provider: IdentityProvider,
  id: string,
  entityKind?: IdentityEntityKind,
): ExternalIdentity {
  return { provider, id, entityKind };
}

function edge(
  source: ExternalIdentity,
  target: ExternalIdentity,
  options: {
    confidence: number;
    method: IdentityMatchMethod;
    verified?: boolean;
    evidence: IdentityEvidence[];
    now?: Date;
  },
): IdentityEdge {
  const at = (options.now ?? new Date()).toISOString();
  return {
    source,
    target,
    confidence: options.confidence,
    method: options.method,
    verified: options.verified ?? false,
    evidence: options.evidence,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Build bidirectional provider edges from a bag of known external ids.
 * Official provider cross-IDs get high confidence (AGENTS.md §18.6).
 */
export function buildEdgesFromProviderIds(
  ids: ProviderIdBag,
  options: {
    entityKind?: IdentityEntityKind;
    sourceProvider?: IdentityProvider;
    now?: Date;
  } = {},
): IdentityEdge[] {
  const entityKind = options.entityKind ?? 'movie';
  const now = options.now;
  const nodes: ExternalIdentity[] = [];

  const pairs: Array<[IdentityProvider, string | number | null | undefined]> = [
    ['tmdb', ids.tmdb],
    ['imdb', ids.imdb],
    ['tvdb', ids.tvdb],
    ['trakt', ids.trakt],
    ['mal', ids.mal],
    ['anilist', ids.anilist],
    ['kitsu', ids.kitsu],
    ['anidb', ids.anidb],
    ['simkl', ids.simkl],
    ['tvmaze', ids.tvmaze],
  ];

  for (const [provider, raw] of pairs) {
    const id = asId(raw);
    if (id) nodes.push(node(provider, id, entityKind));
  }

  if (nodes.length < 2) return [];

  const anchor =
    (options.sourceProvider
      ? nodes.find((item) => item.provider === options.sourceProvider)
      : undefined) ??
    nodes.find((item) => item.provider === 'tmdb') ??
    nodes[0]!;

  const edges: IdentityEdge[] = [];
  for (const target of nodes) {
    if (target.provider === anchor.provider && target.id === anchor.id) continue;
    const evidence: IdentityEvidence[] = [
      {
        kind: 'provider-response',
        summary: `${anchor.provider}:${anchor.id} ↔ ${target.provider}:${target.id}`,
        source: options.sourceProvider ?? anchor.provider,
        observedAt: (now ?? new Date()).toISOString(),
      },
    ];
    edges.push(
      edge(anchor, target, {
        confidence: 0.95,
        method: 'provider',
        verified: false,
        evidence,
        now,
      }),
      edge(target, anchor, {
        confidence: 0.95,
        method: 'provider',
        verified: false,
        evidence,
        now,
      }),
    );
  }

  return edges;
}

/** Exact-match edge when two ids are known equal by deterministic rule. */
export function buildExactMatchEdge(
  source: ExternalIdentity,
  target: ExternalIdentity,
  summary: string,
  now = new Date(),
): IdentityEdge {
  return edge(source, target, {
    confidence: 1,
    method: 'exact-match',
    verified: true,
    evidence: [{ kind: 'exact-id', summary, observedAt: now.toISOString() }],
    now,
  });
}

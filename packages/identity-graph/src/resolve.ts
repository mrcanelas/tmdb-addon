import {
  createCanonicalId,
  deterministicCanonicalSuffix,
} from './canonical.js';
import { buildEdgesFromProviderIds, type ProviderIdBag } from './edges.js';
import {
  precedenceScore,
  type CanonicalIdentity,
  type ExternalIdentity,
  type IdentityEdge,
  type IdentityEntityKind,
  type IdentityProvider,
} from './types.js';

export interface IdentityCorrectionStub {
  /** Local/community identity corrections from @metalayer/corrections. */
  edge: IdentityEdge;
}

export interface ResolveIdentityInput {
  ids: ProviderIdBag;
  entityKind?: IdentityEntityKind;
  /** Precomputed edges (optional). When omitted, built from ids. */
  edges?: IdentityEdge[];
  corrections?: IdentityCorrectionStub[];
  /** Reuse an existing canonical id when known. */
  canonicalId?: string;
  now?: Date;
}

export interface ResolvedIdentityMapping {
  canonical: CanonicalIdentity;
  matches: ExternalIdentity[];
  edges: IdentityEdge[];
  /** Best edge used for each provider match (excluding metalayer). */
  selectedByProvider: Record<string, IdentityEdge>;
  unresolvedProviders: IdentityProvider[];
  lowConfidence: IdentityEdge[];
}

const LOW_CONFIDENCE = 0.7;

/**
 * Resolve a work's cross-provider mapping with observable precedence.
 * Low-confidence edges never silently override higher-precedence ones.
 */
export function resolveIdentityMapping(
  input: ResolveIdentityInput,
): ResolvedIdentityMapping {
  const entityKind = input.entityKind ?? 'movie';
  const now = input.now ?? new Date();
  const autoEdges =
    input.edges ??
    buildEdgesFromProviderIds(input.ids, {
      entityKind,
      now,
    });

  const correctionEdges = (input.corrections ?? []).map((item) => item.edge);
  const edges = [...correctionEdges, ...autoEdges];

  const matches = collectMatches(input.ids, entityKind);
  const selectedByProvider: Record<string, IdentityEdge> = {};

  for (const match of matches) {
    const candidates = edges.filter(
      (edge) =>
        (edge.target.provider === match.provider && edge.target.id === match.id) ||
        (edge.source.provider === match.provider && edge.source.id === match.id),
    );
    if (candidates.length === 0) continue;
    const best = [...candidates].sort(
      (a, b) => precedenceScore(b) - precedenceScore(a),
    )[0]!;
    const existing = selectedByProvider[match.provider];
    if (!existing || precedenceScore(best) > precedenceScore(existing)) {
      selectedByProvider[match.provider] = best;
    }
  }

  const lowConfidence = Object.values(selectedByProvider).filter(
    (edge) => edge.confidence < LOW_CONFIDENCE && !edge.verified,
  );

  const knownProviders = new Set(matches.map((item) => item.provider));
  const unresolvedProviders: IdentityProvider[] = (
    ['tvdb', 'trakt', 'mal', 'anilist'] as IdentityProvider[]
  ).filter((provider) => !knownProviders.has(provider));

  const suffix =
    input.canonicalId?.split(':').pop() ??
    deterministicCanonicalSuffix({
      tmdb: input.ids.tmdb,
      imdb: input.ids.imdb,
      tvdb: input.ids.tvdb,
    });

  const canonical = input.canonicalId
    ? {
        id: input.canonicalId,
        entityKind,
        createdAt: now.toISOString(),
      }
    : createCanonicalId(entityKind, suffix, now);

  return {
    canonical,
    matches,
    edges,
    selectedByProvider,
    unresolvedProviders,
    lowConfidence,
  };
}

function collectMatches(
  ids: ProviderIdBag,
  entityKind: IdentityEntityKind,
): ExternalIdentity[] {
  const out: ExternalIdentity[] = [];
  const add = (provider: IdentityProvider, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    out.push({ provider, id: String(value), entityKind });
  };
  add('tmdb', ids.tmdb);
  add('imdb', ids.imdb);
  add('tvdb', ids.tvdb);
  add('trakt', ids.trakt);
  add('mal', ids.mal);
  add('anilist', ids.anilist);
  add('kitsu', ids.kitsu);
  add('anidb', ids.anidb);
  add('simkl', ids.simkl);
  add('tvmaze', ids.tvmaze);
  return out;
}

/** Look up a provider id within a resolved mapping. */
export function findProviderId(
  mapping: ResolvedIdentityMapping,
  provider: IdentityProvider,
): string | null {
  return mapping.matches.find((item) => item.provider === provider)?.id ?? null;
}

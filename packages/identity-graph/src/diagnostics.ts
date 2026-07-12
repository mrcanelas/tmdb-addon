import type { ResolvedIdentityMapping } from './resolve.js';
import type { IdentityEdge } from './types.js';

export interface IdentityDiagnostics {
  canonicalId: string;
  entityKind: string;
  matches: Array<{ provider: string; id: string }>;
  edgeCount: number;
  edges: Array<{
    from: string;
    to: string;
    confidence: number;
    method: string;
    verified: boolean;
    precedenceScore: number;
    evidence: string[];
  }>;
  selectedByProvider: Record<
    string,
    { confidence: number; method: string; verified: boolean }
  >;
  unresolvedProviders: string[];
  lowConfidenceCount: number;
  warnings: string[];
}

function edgeLabel(edge: IdentityEdge): { from: string; to: string } {
  return {
    from: `${edge.source.provider}:${edge.source.id}`,
    to: `${edge.target.provider}:${edge.target.id}`,
  };
}

/** Observable diagnostics for Meta Inspector / operator tools (AGENTS.md §18). */
export function buildIdentityDiagnostics(
  mapping: ResolvedIdentityMapping,
  precedenceScore: (edge: IdentityEdge) => number,
): IdentityDiagnostics {
  const warnings: string[] = [];

  if (mapping.matches.length < 2) {
    warnings.push('Fewer than two provider identities — graph is incomplete');
  }
  for (const edge of mapping.lowConfidence) {
    warnings.push(
      `Low-confidence edge ${edge.source.provider}:${edge.source.id} → ${edge.target.provider}:${edge.target.id} (${edge.confidence})`,
    );
  }
  if (mapping.unresolvedProviders.length > 0) {
    warnings.push(
      `Unresolved providers: ${mapping.unresolvedProviders.join(', ')}`,
    );
  }

  return {
    canonicalId: mapping.canonical.id,
    entityKind: mapping.canonical.entityKind,
    matches: mapping.matches.map((item) => ({
      provider: item.provider,
      id: item.id,
    })),
    edgeCount: mapping.edges.length,
    edges: mapping.edges.map((edge) => {
      const label = edgeLabel(edge);
      return {
        from: label.from,
        to: label.to,
        confidence: edge.confidence,
        method: edge.method,
        verified: edge.verified,
        precedenceScore: precedenceScore(edge),
        evidence: edge.evidence.map((item) => item.summary),
      };
    }),
    selectedByProvider: Object.fromEntries(
      Object.entries(mapping.selectedByProvider).map(([provider, edge]) => [
        provider,
        {
          confidence: edge.confidence,
          method: edge.method,
          verified: edge.verified,
        },
      ]),
    ),
    unresolvedProviders: mapping.unresolvedProviders,
    lowConfidenceCount: mapping.lowConfidence.length,
    warnings,
  };
}

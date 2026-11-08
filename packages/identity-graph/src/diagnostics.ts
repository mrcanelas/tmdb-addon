import type { ResolvedIdentityMapping } from './resolve.js';
import type { IdentityEdge } from './types.js';

export type IdentityWarningCode =
  | 'INCOMPLETE_GRAPH'
  | 'LOW_CONFIDENCE_EDGE'
  | 'UNRESOLVED_PROVIDERS';

export interface IdentityDiagnosticWarning {
  code: IdentityWarningCode;
  params?: {
    from?: string;
    to?: string;
    confidence?: number;
    providers?: string;
  };
}

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
  warnings: IdentityDiagnosticWarning[];
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
  const warnings: IdentityDiagnosticWarning[] = [];

  if (mapping.matches.length < 2) {
    warnings.push({ code: 'INCOMPLETE_GRAPH' });
  }
  for (const edge of mapping.lowConfidence) {
    const label = edgeLabel(edge);
    warnings.push({
      code: 'LOW_CONFIDENCE_EDGE',
      params: {
        from: label.from,
        to: label.to,
        confidence: edge.confidence,
      },
    });
  }
  if (mapping.unresolvedProviders.length > 0) {
    warnings.push({
      code: 'UNRESOLVED_PROVIDERS',
      params: { providers: mapping.unresolvedProviders.join(', ') },
    });
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

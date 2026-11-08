import type {
  IdentityCorrectionStub,
  IdentityEdge,
  IdentityEvidence,
} from '@metalayer/identity-graph';
import type { ExternalIdPayload, MetadataCorrection } from './types.js';
import { isActiveCorrection } from './validate.js';

/**
 * Convert external-id corrections into Identity Graph stubs.
 * Local verified/manual corrections outrank community via edge method flags.
 */
export function toIdentityCorrectionStubs(
  corrections: MetadataCorrection[],
  now = new Date(),
): IdentityCorrectionStub[] {
  const iso = now.toISOString();
  const stubs: IdentityCorrectionStub[] = [];

  for (const correction of corrections.filter(isActiveCorrection)) {
    if (
      correction.type !== 'wrong_external_id' &&
      correction.type !== 'missing_external_id'
    ) {
      continue;
    }
    const payload = correction.payload as ExternalIdPayload;
    if (!payload?.provider || !payload.id) continue;

    const evidence: IdentityEvidence[] = correction.sources.map((source) => ({
      kind: 'manual-note' as const,
      summary: source.label,
      source: source.url,
      observedAt: source.observedAt ?? correction.updatedAt,
    }));

    const edge: IdentityEdge = {
      source: correction.target,
      target: {
        provider: payload.provider as IdentityEdge['target']['provider'],
        id: payload.id,
        entityKind: correction.target.entityKind,
      },
      confidence: correction.status === 'verified' ? 1 : 0.95,
      method: correction.scope === 'local' ? 'manual' : 'community',
      verified: correction.status === 'verified' || correction.status === 'local',
      evidence,
      createdAt: correction.createdAt,
      updatedAt: iso,
    };

    stubs.push({ edge });
  }

  return stubs;
}

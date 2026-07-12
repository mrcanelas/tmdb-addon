import type { CorrectionStatus, MetadataCorrection } from './types.js';
import type { CorrectionRegistry } from './registry.js';

export type ModerationAction =
  | { type: 'propose' }
  | { type: 'verify' }
  | { type: 'reject' }
  | { type: 'deprecate' }
  | { type: 'supersede'; replacementId: string };

const TRANSITIONS: Record<CorrectionStatus, CorrectionStatus[]> = {
  local: ['proposed', 'verified', 'deprecated'],
  proposed: ['verified', 'rejected', 'deprecated'],
  verified: ['deprecated', 'superseded'],
  rejected: ['proposed', 'deprecated'],
  deprecated: [],
  superseded: [],
};

export function allowedModerationStatuses(from: CorrectionStatus): CorrectionStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function applyModeration(
  registry: CorrectionRegistry,
  configId: string,
  correctionId: string,
  action: ModerationAction,
  now = new Date(),
): MetadataCorrection | null {
  const existing = registry.get(configId, correctionId);
  if (!existing || existing.scope !== 'local') return null;

  let next: CorrectionStatus;
  let supersededBy: string | undefined;

  switch (action.type) {
    case 'propose':
      next = 'proposed';
      break;
    case 'verify':
      next = 'verified';
      break;
    case 'reject':
      next = 'rejected';
      break;
    case 'deprecate':
      next = 'deprecated';
      break;
    case 'supersede':
      next = 'superseded';
      supersededBy = action.replacementId;
      break;
  }

  if (!allowedModerationStatuses(existing.status).includes(next)) {
    return null;
  }

  return registry.updateStatus(configId, correctionId, next, {
    supersededBy,
    now,
  });
}

import type { MetadataCorrection } from './types.js';
import { isActiveCorrection } from './validate.js';

/** Target + type key used for local-over-community precedence. */
export function correctionConflictKey(correction: MetadataCorrection): string {
  return [
    correction.target.provider,
    correction.target.id,
    correction.type,
  ].join(':');
}

/**
 * Local overrides take precedence over community corrections (AGENTS.md §19.6).
 * Inactive statuses are dropped. When both scopes conflict, local wins.
 */
export function resolveActiveCorrections(
  local: MetadataCorrection[],
  community: MetadataCorrection[],
): MetadataCorrection[] {
  const byKey = new Map<string, MetadataCorrection>();

  for (const item of community.filter(isActiveCorrection)) {
    byKey.set(correctionConflictKey(item), item);
  }
  for (const item of local.filter(isActiveCorrection)) {
    byKey.set(correctionConflictKey(item), item);
  }

  return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function filterCorrectionsForTarget(
  corrections: MetadataCorrection[],
  provider: string,
  id: string,
): MetadataCorrection[] {
  return corrections.filter(
    (item) => item.target.provider === provider && item.target.id === id,
  );
}

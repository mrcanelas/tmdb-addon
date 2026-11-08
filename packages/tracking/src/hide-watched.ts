import type { RuleCandidate } from '@metalayer/rules';
import type { WatchStateIndex } from './types.js';
import { lookupWatched } from './index-build.js';

/**
 * Annotate catalog/rule candidates with `watched` from a tracking index.
 * Missing index leaves `watched` unchanged (hideWatched becomes a no-op exclude).
 */
export function annotateWatchedCandidates<T extends RuleCandidate>(
  candidates: T[],
  index: WatchStateIndex | null | undefined,
  resolveIds: (item: T) => Record<string, string | number | undefined | null>,
): Array<T & { watched: boolean }> {
  if (!index) {
    return candidates.map((item) => ({
      ...item,
      watched: Boolean(item.watched),
    }));
  }
  return candidates.map((item) => ({
    ...item,
    watched: lookupWatched(index, resolveIds(item)),
  }));
}

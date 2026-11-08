import type { WatchStateEntry, WatchStateIndex, TrackingProviderId } from './types.js';
import { isWatchedStatus } from './watch-state.js';

export function watchStateKey(
  provider: string,
  id: string | number,
): string {
  return `${provider}:${String(id).toLowerCase()}`;
}

export function buildWatchStateIndex(
  provider: TrackingProviderId,
  entries: WatchStateEntry[],
  options: { degraded?: boolean; now?: Date } = {},
): WatchStateIndex {
  const byKey = new Map<string, WatchStateEntry>();
  for (const entry of entries) {
    for (const [providerId, value] of Object.entries(entry.externalIds)) {
      if (value === undefined || value === null || value === '') continue;
      byKey.set(watchStateKey(providerId, value), entry);
    }
  }
  return {
    byKey,
    provider,
    fetchedAt: (options.now ?? new Date()).toISOString(),
    degraded: options.degraded ?? false,
  };
}

export function lookupWatched(
  index: WatchStateIndex | null | undefined,
  ids: Record<string, string | number | undefined | null>,
): boolean {
  if (!index || index.byKey.size === 0) return false;
  for (const [provider, value] of Object.entries(ids)) {
    if (value === undefined || value === null || value === '') continue;
    const entry = index.byKey.get(watchStateKey(provider, value));
    if (entry && isWatchedStatus(entry.status)) return true;
  }
  return false;
}

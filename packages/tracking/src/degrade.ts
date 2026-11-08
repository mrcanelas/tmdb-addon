import type { TrackingFailure, TrackingProviderId, WatchStateEntry } from './types.js';
import { buildWatchStateIndex } from './index-build.js';
import type { WatchStateIndex } from './types.js';

/**
 * Safe wrapper: tracking failures degrade observably and never throw into
 * metadata/catalog paths (AGENTS.md Phase I exit).
 */
export async function safeLoadWatchStates(
  provider: TrackingProviderId,
  load: () => Promise<WatchStateEntry[]>,
): Promise<{
  entries: WatchStateEntry[];
  index: WatchStateIndex;
  failure: TrackingFailure | null;
}> {
  try {
    const entries = await load();
    return {
      entries,
      index: buildWatchStateIndex(provider, entries, { degraded: false }),
      failure: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Tracking provider unavailable';
    const failure: TrackingFailure = {
      provider,
      code: 'upstream',
      message,
      retryable: true,
    };
    return {
      entries: [],
      index: buildWatchStateIndex(provider, [], { degraded: true }),
      failure,
    };
  }
}

export type {
  TrackingProviderId,
  WatchStatus,
  TokenConnectionState,
  WatchStateEntry,
  WatchStateIndex,
  TrackingPort,
  TrackingFailure,
  TokenEvent,
} from './types.js';

export {
  normalizeWatchStatus,
  isWatchedStatus,
  transitionTokenState,
} from './watch-state.js';

export {
  watchStateKey,
  buildWatchStateIndex,
  lookupWatched,
} from './index-build.js';

export { annotateWatchedCandidates } from './hide-watched.js';
export { safeLoadWatchStates } from './degrade.js';

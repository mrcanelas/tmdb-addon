import type {
  TokenConnectionState,
  TokenEvent,
  WatchStatus,
} from './types.js';

const WATCHED_STATUSES = new Set<WatchStatus>(['completed', 'watching']);

export function normalizeWatchStatus(raw: string | null | undefined): WatchStatus {
  if (!raw) return 'unknown';
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (value) {
    case 'watching':
    case 'current':
    case 'in_progress':
      return 'watching';
    case 'completed':
    case 'watched':
    case 'finished':
      return 'completed';
    case 'on_hold':
    case 'paused':
      return 'on_hold';
    case 'dropped':
      return 'dropped';
    case 'plan_to_watch':
    case 'plantowatch':
    case 'planned':
    case 'watchlist':
      return 'plan_to_watch';
    default:
      return 'unknown';
  }
}

export function isWatchedStatus(status: WatchStatus): boolean {
  return WATCHED_STATUSES.has(status);
}

/**
 * Token connection state machine (AGENTS.md §20.4).
 * Failures move to reconnect/expired/degraded without wiping unrelated config.
 */
export function transitionTokenState(
  current: TokenConnectionState,
  event: TokenEvent,
): TokenConnectionState {
  switch (event.type) {
    case 'cleared':
      return 'not_configured';
    case 'credentials_saved':
      return current === 'connected' ? 'connected' : 'reconnect_required';
    case 'auth_success':
    case 'refresh_success':
      return 'connected';
    case 'refresh_failed':
      return 'expired';
    case 'unauthorized':
      return 'invalid';
    case 'upstream_error':
      return current === 'not_configured' ? 'not_configured' : 'degraded';
    default:
      return current;
  }
}

export type TrackingProviderId =
  | 'trakt'
  | 'simkl'
  | 'anilist'
  | 'mal'
  | 'kitsu'
  | 'tmdb';

export type WatchStatus =
  | 'watching'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_watch'
  | 'unknown';

/** Public connection state — never includes tokens (AGENTS.md §20.3 / §23.5). */
export type TokenConnectionState =
  | 'not_configured'
  | 'connected'
  | 'expired'
  | 'invalid'
  | 'reconnect_required'
  | 'degraded';

export interface WatchStateEntry {
  provider: TrackingProviderId;
  mediaType: 'movie' | 'series' | 'anime';
  status: WatchStatus;
  /** External ids known for this entry. */
  externalIds: Record<string, string | number>;
  progress?: number;
  watchedAt?: string;
}

export interface WatchStateIndex {
  /** Lookup keys like `imdb:tt123`, `tmdb:550`, `trakt:178794`. */
  byKey: Map<string, WatchStateEntry>;
  provider: TrackingProviderId;
  fetchedAt: string;
  degraded: boolean;
}

export interface TrackingPort {
  readonly id: TrackingProviderId;
  getWatchStates(input?: {
    mediaType?: 'movie' | 'series' | 'anime';
  }): Promise<WatchStateEntry[]>;
  getWatchlist?(input?: {
    mediaType?: 'movie' | 'series' | 'anime';
  }): Promise<WatchStateEntry[]>;
  refreshAccessToken?(): Promise<{ accessToken: string; refreshToken?: string }>;
}

export interface TrackingFailure {
  provider: TrackingProviderId;
  code:
    | 'token_expired'
    | 'token_invalid'
    | 'rate_limited'
    | 'upstream'
    | 'not_configured';
  message: string;
  retryable: boolean;
}

export type TokenEvent =
  | { type: 'credentials_saved' }
  | { type: 'auth_success' }
  | { type: 'refresh_success' }
  | { type: 'refresh_failed' }
  | { type: 'unauthorized' }
  | { type: 'upstream_error' }
  | { type: 'cleared' };

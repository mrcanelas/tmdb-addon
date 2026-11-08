import type { ExternalIdentity, IdentityProvider } from '@metalayer/identity-graph';

export type { ExternalIdentity };

/** Correction kinds (AGENTS.md §19.2). */
export type CorrectionType =
  | 'wrong_external_id'
  | 'missing_external_id'
  | 'season_reassignment'
  | 'episode_reassignment'
  | 'split_episode'
  | 'combined_episode'
  | 'alternative_numbering'
  | 'absolute_numbering'
  | 'dvd_order'
  | 'broadcast_order'
  | 'specials_mapping'
  | 'title_correction'
  | 'date_correction'
  | 'runtime_correction'
  | 'certification_correction'
  | 'artwork_override'
  | 'hidden_malformed_item';

/** Lifecycle states (AGENTS.md §19.3). */
export type CorrectionStatus =
  | 'local'
  | 'proposed'
  | 'verified'
  | 'rejected'
  | 'deprecated'
  | 'superseded';

export type CorrectionScope = 'local' | 'community';

export interface CorrectionSource {
  kind: 'manual' | 'community-file' | 'provider-report' | 'test-fixture';
  label: string;
  url?: string;
  observedAt?: string;
}

export interface MetadataCorrection {
  id: string;
  schemaVersion: number;
  target: ExternalIdentity;
  type: CorrectionType;
  payload: unknown;
  reason: string;
  sources: CorrectionSource[];
  author?: string;
  status: CorrectionStatus;
  scope: CorrectionScope;
  createdAt: string;
  updatedAt: string;
  /** When superseded, points at the replacement correction id. */
  supersededBy?: string;
}

export const CORRECTION_SCHEMA_VERSION = 1;

export const CORRECTION_TYPES: CorrectionType[] = [
  'wrong_external_id',
  'missing_external_id',
  'season_reassignment',
  'episode_reassignment',
  'split_episode',
  'combined_episode',
  'alternative_numbering',
  'absolute_numbering',
  'dvd_order',
  'broadcast_order',
  'specials_mapping',
  'title_correction',
  'date_correction',
  'runtime_correction',
  'certification_correction',
  'artwork_override',
  'hidden_malformed_item',
];

export const ACTIVE_STATUSES: CorrectionStatus[] = [
  'local',
  'proposed',
  'verified',
];

export interface TitleCorrectionPayload {
  title: string;
}

export interface RuntimeCorrectionPayload {
  runtimeMinutes: number;
}

export interface ExternalIdPayload {
  provider: string;
  id: string;
}

export interface EpisodeMappingPayload {
  from: { season: number; episode: number };
  to: { season: number; episode: number };
}

export interface AbsoluteNumberingPayload {
  absolute: number;
  season: number;
  episode: number;
}

export interface AlternativeOrderPayload {
  order: 'dvd' | 'broadcast' | 'absolute';
  episodes: Array<{ season: number; episode: number; absolute?: number }>;
}

export interface ArtworkOverridePayload {
  kind: 'poster' | 'background' | 'logo';
  url: string;
}

export interface AppliedFieldOverlay {
  field: string;
  value: unknown;
  correctionId: string;
  scope: CorrectionScope;
  type: CorrectionType;
}

export interface EpisodeRemapResult {
  season: number;
  episode: number;
  correctionId: string | null;
  absolute?: number;
}

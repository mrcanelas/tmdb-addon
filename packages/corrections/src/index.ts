export type {
  CorrectionType,
  CorrectionStatus,
  CorrectionScope,
  CorrectionSource,
  MetadataCorrection,
  TitleCorrectionPayload,
  RuntimeCorrectionPayload,
  ExternalIdPayload,
  EpisodeMappingPayload,
  AbsoluteNumberingPayload,
  AlternativeOrderPayload,
  ArtworkOverridePayload,
  AppliedFieldOverlay,
  EpisodeRemapResult,
} from './types.js';

export {
  CORRECTION_SCHEMA_VERSION,
  CORRECTION_TYPES,
  ACTIVE_STATUSES,
} from './types.js';

export { validateCorrection, isActiveCorrection } from './validate.js';
export type { ValidationIssue } from './validate.js';

export {
  correctionConflictKey,
  resolveActiveCorrections,
  filterCorrectionsForTarget,
  filterCorrectionsForIdentity,
} from './precedence.js';

export {
  CorrectionRegistry,
  CorrectionValidationError,
} from './registry.js';
export type { CreateCorrectionInput, ValidationSummary } from './registry.js';

export {
  applyMetadataCorrections,
  remapEpisode,
  correctionsReferenceSpecialSeason,
  applyEpisodeCorrectionsToVideos,
} from './apply.js';
export type { StremioEpisodeVideo } from './apply.js';

export { applyModeration, allowedModerationStatuses } from './moderate.js';
export type { ModerationAction } from './moderate.js';

export { toIdentityCorrectionStubs } from './identity-bridge.js';

export { loadSampleCommunityCorrections } from './community/load-samples.js';

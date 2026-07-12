import type {
  AbsoluteNumberingPayload,
  AlternativeOrderPayload,
  AppliedFieldOverlay,
  ArtworkOverridePayload,
  EpisodeMappingPayload,
  EpisodeRemapResult,
  ExternalIdPayload,
  MetadataCorrection,
  RuntimeCorrectionPayload,
  TitleCorrectionPayload,
} from './types.js';
import { isActiveCorrection } from './validate.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Apply active corrections as field overlays without mutating provider adapters.
 */
export function applyMetadataCorrections(
  base: Record<string, unknown>,
  corrections: MetadataCorrection[],
): {
  value: Record<string, unknown>;
  overlays: AppliedFieldOverlay[];
  hidden: boolean;
} {
  const value = { ...base };
  const overlays: AppliedFieldOverlay[] = [];
  let hidden = false;

  for (const correction of corrections.filter(isActiveCorrection)) {
    switch (correction.type) {
      case 'title_correction': {
        const payload = correction.payload as TitleCorrectionPayload;
        if (typeof payload?.title === 'string') {
          value.title = payload.title;
          overlays.push({
            field: 'title',
            value: payload.title,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'runtime_correction': {
        const payload = correction.payload as RuntimeCorrectionPayload;
        if (typeof payload?.runtimeMinutes === 'number') {
          value.runtime = payload.runtimeMinutes;
          overlays.push({
            field: 'runtime',
            value: payload.runtimeMinutes,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'date_correction': {
        if (isRecord(correction.payload) && typeof correction.payload.releaseDate === 'string') {
          value.releaseDate = correction.payload.releaseDate;
          overlays.push({
            field: 'releaseDate',
            value: correction.payload.releaseDate,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'certification_correction': {
        if (isRecord(correction.payload) && typeof correction.payload.certification === 'string') {
          value.certification = correction.payload.certification;
          overlays.push({
            field: 'certification',
            value: correction.payload.certification,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'artwork_override': {
        const payload = correction.payload as ArtworkOverridePayload;
        if (payload?.kind && typeof payload.url === 'string') {
          value[payload.kind] = payload.url;
          overlays.push({
            field: payload.kind,
            value: payload.url,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'wrong_external_id':
      case 'missing_external_id': {
        const payload = correction.payload as ExternalIdPayload;
        if (payload?.provider && payload.id) {
          const externalIds = isRecord(value.externalIds)
            ? { ...value.externalIds }
            : {};
          externalIds[payload.provider] = payload.id;
          value.externalIds = externalIds;
          overlays.push({
            field: `externalIds.${payload.provider}`,
            value: payload.id,
            correctionId: correction.id,
            scope: correction.scope,
            type: correction.type,
          });
        }
        break;
      }
      case 'hidden_malformed_item': {
        hidden = true;
        overlays.push({
          field: 'hidden',
          value: true,
          correctionId: correction.id,
          scope: correction.scope,
          type: correction.type,
        });
        break;
      }
      default:
        break;
    }
  }

  return { value, overlays, hidden };
}

/**
 * Remap a season/episode using episode and numbering corrections.
 */
export function remapEpisode(
  season: number,
  episode: number,
  corrections: MetadataCorrection[],
): EpisodeRemapResult {
  let current = { season, episode };
  let correctionId: string | null = null;
  let absolute: number | undefined;

  for (const correction of corrections.filter(isActiveCorrection)) {
    if (
      correction.type === 'episode_reassignment' ||
      correction.type === 'season_reassignment'
    ) {
      const payload = correction.payload as EpisodeMappingPayload;
      if (
        payload?.from?.season === current.season &&
        payload?.from?.episode === current.episode &&
        payload.to
      ) {
        current = { season: payload.to.season, episode: payload.to.episode };
        correctionId = correction.id;
      }
    }

    if (correction.type === 'absolute_numbering') {
      const payload = correction.payload as AbsoluteNumberingPayload;
      if (
        payload?.season === current.season &&
        payload?.episode === current.episode &&
        typeof payload.absolute === 'number'
      ) {
        absolute = payload.absolute;
        correctionId = correction.id;
      }
    }

    if (
      correction.type === 'dvd_order' ||
      correction.type === 'broadcast_order' ||
      correction.type === 'alternative_numbering'
    ) {
      const payload = correction.payload as AlternativeOrderPayload;
      const match = payload?.episodes?.find(
        (item) => item.season === season && item.episode === episode,
      );
      if (match) {
        current = { season: match.season, episode: match.episode };
        if (typeof match.absolute === 'number') absolute = match.absolute;
        correctionId = correction.id;
      }
    }
  }

  return { ...current, correctionId, absolute };
}

import {
  CORRECTION_SCHEMA_VERSION,
  type CorrectionScope,
  type CorrectionStatus,
  type CorrectionType,
  type MetadataCorrection,
} from './types.js';
import { validateCorrection } from './validate.js';
import { resolveActiveCorrections } from './precedence.js';

export interface CreateCorrectionInput {
  id?: string;
  target: MetadataCorrection['target'];
  type: CorrectionType;
  payload: unknown;
  reason: string;
  sources: MetadataCorrection['sources'];
  author?: string;
  status?: CorrectionStatus;
  scope?: CorrectionScope;
  now?: Date;
}

function newId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * In-memory Correction Hub registry.
 * Corrections stay independent of provider adapters.
 */
export class CorrectionRegistry {
  private readonly community = new Map<string, MetadataCorrection>();
  private readonly localByConfig = new Map<string, Map<string, MetadataCorrection>>();

  loadCommunity(items: unknown[]): { loaded: number; rejected: ValidationSummary[] } {
    const rejected: ValidationSummary[] = [];
    let loaded = 0;
    for (const item of items) {
      const result = validateCorrection(item);
      if (!result.ok || !result.value) {
        rejected.push({
          id: typeof (item as { id?: string })?.id === 'string' ? (item as { id: string }).id : 'unknown',
          issues: result.issues,
        });
        continue;
      }
      if (result.value.scope !== 'community') {
        rejected.push({
          id: result.value.id,
          issues: [
            {
              path: 'scope',
              message: 'Community catalog entries must use scope=community',
              code: 'INVALID_SCOPE',
            },
          ],
        });
        continue;
      }
      this.community.set(result.value.id, result.value);
      loaded += 1;
    }
    return { loaded, rejected };
  }

  listCommunity(): MetadataCorrection[] {
    return [...this.community.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  listLocal(configId: string): MetadataCorrection[] {
    const map = this.localByConfig.get(configId);
    if (!map) return [];
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  listResolved(configId: string): MetadataCorrection[] {
    return resolveActiveCorrections(this.listLocal(configId), this.listCommunity());
  }

  get(configId: string, correctionId: string): MetadataCorrection | null {
    return (
      this.localByConfig.get(configId)?.get(correctionId) ??
      this.community.get(correctionId) ??
      null
    );
  }

  upsertLocal(configId: string, input: CreateCorrectionInput): MetadataCorrection {
    const now = (input.now ?? new Date()).toISOString();
    const draft: MetadataCorrection = {
      id: input.id ?? newId(),
      schemaVersion: CORRECTION_SCHEMA_VERSION,
      target: input.target,
      type: input.type,
      payload: input.payload,
      reason: input.reason,
      sources: input.sources,
      author: input.author,
      status: input.status ?? 'local',
      scope: input.scope ?? 'local',
      createdAt: now,
      updatedAt: now,
    };

    const validated = validateCorrection(draft);
    if (!validated.ok || !validated.value) {
      const detail = validated.issues.map((issue) => issue.message).join('; ');
      throw new CorrectionValidationError(detail, validated.issues);
    }

    let map = this.localByConfig.get(configId);
    if (!map) {
      map = new Map();
      this.localByConfig.set(configId, map);
    }
    const existing = map.get(validated.value.id);
    const stored: MetadataCorrection = existing
      ? { ...validated.value, createdAt: existing.createdAt, updatedAt: now }
      : validated.value;
    map.set(stored.id, stored);
    return stored;
  }

  deleteLocal(configId: string, correctionId: string): boolean {
    const map = this.localByConfig.get(configId);
    if (!map) return false;
    return map.delete(correctionId);
  }

  updateStatus(
    configId: string,
    correctionId: string,
    status: CorrectionStatus,
    options?: { supersededBy?: string; now?: Date },
  ): MetadataCorrection | null {
    const map = this.localByConfig.get(configId);
    const existing = map?.get(correctionId);
    if (!existing || !map) return null;
    const updated: MetadataCorrection = {
      ...existing,
      status,
      supersededBy: options?.supersededBy ?? existing.supersededBy,
      updatedAt: (options?.now ?? new Date()).toISOString(),
    };
    map.set(correctionId, updated);
    return updated;
  }
}

export interface ValidationSummary {
  id: string;
  issues: ReturnType<typeof validateCorrection>['issues'];
}

export class CorrectionValidationError extends Error {
  readonly issues: ValidationSummary['issues'];

  constructor(message: string, issues: ValidationSummary['issues']) {
    super(message);
    this.name = 'CorrectionValidationError';
    this.issues = issues;
  }
}

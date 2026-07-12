import {
  ACTIVE_STATUSES,
  CORRECTION_SCHEMA_VERSION,
  CORRECTION_TYPES,
  type CorrectionScope,
  type CorrectionSource,
  type CorrectionStatus,
  type CorrectionType,
  type MetadataCorrection,
} from './types.js';
import type { IdentityProvider } from '@metalayer/identity-graph';

export interface ValidationIssue {
  path: string;
  message: string;
  code:
    | 'REQUIRED'
    | 'INVALID_TYPE'
    | 'UNSUPPORTED_VERSION'
    | 'FORBIDDEN_CONTENT'
    | 'INVALID_STATUS'
    | 'INVALID_SCOPE';
}

const STREAM_URL_RE =
  /\.(m3u8?|mp4|mkv|avi|ts)(\?|$)/i;
const MEDIA_HOST_HINTS = [
  'mega.nz',
  'mediafire.com',
  'drive.google.com/file',
  'torrent',
  'magnet:',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scanForbiddenContent(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (STREAM_URL_RE.test(value) || MEDIA_HOST_HINTS.some((hint) => lower.includes(hint))) {
      issues.push({
        path,
        message: 'Corrections must not include stream URLs or copyrighted media links',
        code: 'FORBIDDEN_CONTENT',
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenContent(item, `${path}[${index}]`, issues));
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      scanForbiddenContent(nested, `${path}.${key}`, issues);
    }
  }
}

/**
 * Validate a correction document. Community files and local overrides share this schema.
 */
export function validateCorrection(input: unknown): {
  ok: boolean;
  issues: ValidationIssue[];
  value?: MetadataCorrection;
} {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{ path: '', message: 'Correction must be an object', code: 'INVALID_TYPE' }],
    };
  }

  const requireString = (key: string) => {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim()) {
      issues.push({ path: key, message: `${key} is required`, code: 'REQUIRED' });
      return '';
    }
    return value.trim();
  };

  const id = requireString('id');
  const reason = requireString('reason');
  const createdAt = requireString('createdAt');
  const updatedAt = requireString('updatedAt');

  const schemaVersion = input.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    issues.push({
      path: 'schemaVersion',
      message: 'schemaVersion must be an integer',
      code: 'INVALID_TYPE',
    });
  } else if (schemaVersion !== CORRECTION_SCHEMA_VERSION) {
    issues.push({
      path: 'schemaVersion',
      message: `Unsupported schemaVersion ${schemaVersion}`,
      code: 'UNSUPPORTED_VERSION',
    });
  }

  if (!isRecord(input.target)) {
    issues.push({ path: 'target', message: 'target is required', code: 'REQUIRED' });
  } else {
    if (typeof input.target.provider !== 'string' || !input.target.provider.trim()) {
      issues.push({ path: 'target.provider', message: 'provider is required', code: 'REQUIRED' });
    }
    if (typeof input.target.id !== 'string' || !input.target.id.trim()) {
      issues.push({ path: 'target.id', message: 'id is required', code: 'REQUIRED' });
    }
  }

  const type = input.type;
  if (typeof type !== 'string' || !CORRECTION_TYPES.includes(type as CorrectionType)) {
    issues.push({ path: 'type', message: 'Unknown correction type', code: 'INVALID_TYPE' });
  }

  const status = input.status;
  const validStatuses: CorrectionStatus[] = [
    'local',
    'proposed',
    'verified',
    'rejected',
    'deprecated',
    'superseded',
  ];
  if (typeof status !== 'string' || !validStatuses.includes(status as CorrectionStatus)) {
    issues.push({ path: 'status', message: 'Invalid status', code: 'INVALID_STATUS' });
  }

  const scope = input.scope;
  if (scope !== 'local' && scope !== 'community') {
    issues.push({ path: 'scope', message: 'scope must be local or community', code: 'INVALID_SCOPE' });
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    issues.push({
      path: 'sources',
      message: 'At least one evidence source is required',
      code: 'REQUIRED',
    });
  } else {
    for (const [index, source] of input.sources.entries()) {
      if (!isRecord(source) || typeof source.label !== 'string' || !source.label.trim()) {
        issues.push({
          path: `sources[${index}]`,
          message: 'Each source needs a label',
          code: 'REQUIRED',
        });
      }
    }
  }

  if (input.payload === undefined) {
    issues.push({ path: 'payload', message: 'payload is required', code: 'REQUIRED' });
  } else {
    scanForbiddenContent(input.payload, 'payload', issues);
  }
  scanForbiddenContent(input.reason, 'reason', issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const value: MetadataCorrection = {
    id,
    schemaVersion: schemaVersion as number,
    target: {
      provider: String((input.target as { provider: string }).provider) as IdentityProvider,
      id: String((input.target as { id: string }).id),
      entityKind: (input.target as { entityKind?: MetadataCorrection['target']['entityKind'] })
        .entityKind,
    },
    type: type as CorrectionType,
    payload: input.payload,
    reason,
    sources: input.sources as CorrectionSource[],
    author: typeof input.author === 'string' ? input.author : undefined,
    status: status as CorrectionStatus,
    scope: scope as CorrectionScope,
    createdAt,
    updatedAt,
    supersededBy:
      typeof input.supersededBy === 'string' ? input.supersededBy : undefined,
  };

  return { ok: true, issues: [], value };
}

export function isActiveCorrection(correction: MetadataCorrection): boolean {
  return ACTIVE_STATUSES.includes(correction.status);
}

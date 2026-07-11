/**
 * Stable management-API error codes.
 * Clients translate via t(`errors.${code}`, params).
 * Do not use English sentences as the only public error representation.
 */
export const API_ERROR_CODES = [
  'SOURCE_CREDENTIAL_MISSING',
  'SOURCE_CREDENTIAL_INVALID',
  'CONFIGURATION_NOT_FOUND',
  'CONFIGURATION_INVALID',
  'CONFIGURATION_VERSION_UNSUPPORTED',
  'EDIT_CREDENTIAL_INVALID',
  'LEGACY_IMPORT_FAILED',
  'PROVIDER_UNSUPPORTED_RULE',
  'PROVIDER_UNAVAILABLE',
  'RATE_LIMITED',
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode;
  /** Technical English for logs/operators — not the primary client UX string. */
  message: string;
  correlationId: string;
  params?: Record<string, string | number | boolean | null>;
  details?: unknown;
}

export interface CreateApiErrorInput {
  code: ApiErrorCode;
  message: string;
  correlationId: string;
  params?: Record<string, string | number | boolean | null>;
  details?: unknown;
}

const CODE_SET = new Set<string>(API_ERROR_CODES);

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return CODE_SET.has(value);
}

export function createApiError(input: CreateApiErrorInput): ApiError {
  if (!isApiErrorCode(input.code)) {
    throw new Error(`Unknown API error code: ${String(input.code)}`);
  }
  if (!input.correlationId?.trim()) {
    throw new Error('correlationId is required');
  }
  if (!input.message?.trim()) {
    throw new Error('message is required for server logs');
  }

  const error: ApiError = {
    code: input.code,
    message: input.message,
    correlationId: input.correlationId,
  };

  if (input.params && Object.keys(input.params).length > 0) {
    error.params = input.params;
  }
  if (input.details !== undefined) {
    error.details = input.details;
  }

  return error;
}

/** Translation key path used by the configure UI. */
export function apiErrorTranslationKey(code: ApiErrorCode): string {
  return `errors.${code}`;
}

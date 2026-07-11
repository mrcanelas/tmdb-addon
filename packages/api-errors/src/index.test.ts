import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  apiErrorTranslationKey,
  createApiError,
  isApiErrorCode,
} from './index.js';

describe('@metalayer/api-errors', () => {
  it('exposes stable codes without embedding user-facing locale text as the contract', () => {
    expect(API_ERROR_CODES).toContain('SOURCE_CREDENTIAL_MISSING');
    expect(API_ERROR_CODES).toContain('CONFIGURATION_NOT_FOUND');
    expect(isApiErrorCode('SOURCE_CREDENTIAL_MISSING')).toBe(true);
    expect(isApiErrorCode('NOT_A_REAL_CODE')).toBe(false);
  });

  it('builds a locale-neutral error payload with correlation id', () => {
    const error = createApiError({
      code: 'SOURCE_CREDENTIAL_MISSING',
      message: 'TMDB API key is not configured',
      correlationId: 'corr-123',
      params: { source: 'TMDB' },
    });

    expect(error).toEqual({
      code: 'SOURCE_CREDENTIAL_MISSING',
      message: 'TMDB API key is not configured',
      correlationId: 'corr-123',
      params: { source: 'TMDB' },
    });
    expect(apiErrorTranslationKey(error.code)).toBe('errors.SOURCE_CREDENTIAL_MISSING');
  });

  it('rejects missing correlationId', () => {
    expect(() =>
      createApiError({
        code: 'INTERNAL_ERROR',
        message: 'boom',
        correlationId: '  ',
      }),
    ).toThrow(/correlationId/);
  });
});

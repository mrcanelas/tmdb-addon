import { describe, expect, it } from 'vitest';
import { FASTIFY_LOG_REDACT_PATHS, redactSensitive } from './redact.js';

describe('@metalayer/security redact', () => {
  it('redacts edit credentials and secret map values', () => {
    const redacted = redactSensitive({
      name: 'Family',
      editCredential: 'super-secret-edit',
      secrets: { tmdb: 'tmdb-live-key', trakt: 'trakt-token' },
      note: 'safe',
    });

    expect(redacted).toEqual({
      name: 'Family',
      editCredential: '[REDACTED]',
      secrets: { tmdb: '[REDACTED]', trakt: '[REDACTED]' },
      note: 'safe',
    });
  });

  it('redacts sensitive headers and vault envelopes', () => {
    const envelope = 'v1:1:YWJjZGVmZ2hpams:bG1ub3BxcnN0dXZ3:eHl6MTIzNDU2Nzg5MA';
    const redacted = redactSensitive({
      headers: {
        authorization: 'Bearer abc',
        'x-metalayer-edit-credential': 'edit-token',
        'x-metalayer-dashboard-token': 'operator-token',
        'x-correlation-id': 'ok',
      },
      ciphertext: envelope,
      path: '/c/ml_abc/manifest.json',
    });

    expect(redacted).toEqual({
      headers: {
        authorization: '[REDACTED]',
        'x-metalayer-edit-credential': '[REDACTED]',
        'x-metalayer-dashboard-token': '[REDACTED]',
        'x-correlation-id': 'ok',
      },
      ciphertext: '[REDACTED]',
      path: '/c/ml_abc/manifest.json',
    });
  });

  it('exposes Fastify redact paths covering edit credential and secrets', () => {
    expect(FASTIFY_LOG_REDACT_PATHS.join(' ')).toContain('editCredential');
    expect(FASTIFY_LOG_REDACT_PATHS.join(' ')).toContain('secrets');
    expect(FASTIFY_LOG_REDACT_PATHS.join(' ')).toContain('x-metalayer-edit-credential');
    expect(FASTIFY_LOG_REDACT_PATHS.join(' ')).toContain('x-metalayer-dashboard-token');
  });
});

import { describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  generateConfigId,
  hashEditCredential,
  parseEncryptionKey,
  verifyEditCredential,
  VaultKeyError,
} from './index.js';

describe('@metalayer/security', () => {
  const key = parseEncryptionKey(Buffer.alloc(32, 7).toString('base64'));

  it('round-trips AES-256-GCM secrets', () => {
    const envelope = encryptSecret('tmdb-api-key-value', key);
    expect(envelope.startsWith('v1:1:')).toBe(true);
    expect(decryptSecret(envelope, key)).toBe('tmdb-api-key-value');
  });

  it('rejects tampered ciphertext', () => {
    const envelope = encryptSecret('secret', key);
    const broken = `${envelope.slice(0, -2)}aa`;
    expect(() => decryptSecret(broken, key)).toThrow();
  });

  it('hashes and verifies edit credentials with timing-safe compare', () => {
    const stored = hashEditCredential('correct-horse-battery');
    expect(verifyEditCredential('correct-horse-battery', stored)).toBe(true);
    expect(verifyEditCredential('wrong-password', stored)).toBe(false);
  });

  it('requires a 32-byte encryption key', () => {
    expect(() => parseEncryptionKey(undefined)).toThrow(VaultKeyError);
    expect(() => parseEncryptionKey('too-short')).toThrow(VaultKeyError);
  });

  it('generates non-sequential config ids', () => {
    const a = generateConfigId();
    const b = generateConfigId();
    expect(a).toMatch(/^ml_/);
    expect(a).not.toBe(b);
  });
});

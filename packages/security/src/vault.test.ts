import { describe, expect, it } from 'vitest';
import {
  createEncryptionKeyRing,
  decryptSecret,
  encryptSecret,
  generateConfigId,
  hashEditCredential,
  parseEncryptionKey,
  parseEncryptionKeyRingFromEnv,
  parseSecretEnvelope,
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

  it('decrypts with previous keys after active version bump', () => {
    const oldKey = parseEncryptionKey(Buffer.alloc(32, 3).toString('base64'));
    const newKey = parseEncryptionKey(Buffer.alloc(32, 9).toString('base64'));
    const legacy = encryptSecret('legacy-secret', oldKey, 1);
    expect(parseSecretEnvelope(legacy).keyVersion).toBe(1);

    const ring = createEncryptionKeyRing(newKey, 2, [[1, oldKey]]);
    expect(decryptSecret(legacy, ring)).toBe('legacy-secret');

    const rotated = encryptSecret('new-secret', ring);
    expect(rotated.startsWith('v1:2:')).toBe(true);
    expect(decryptSecret(rotated, ring)).toBe('new-secret');
    expect(() => decryptSecret(rotated, createEncryptionKeyRing(oldKey, 1))).toThrow(
      VaultKeyError,
    );
  });

  it('parses key ring env with previous versions', () => {
    const active = Buffer.alloc(32, 11).toString('base64');
    const previous = Buffer.alloc(32, 5).toString('base64');
    const ring = parseEncryptionKeyRingFromEnv({
      METALAYER_ENCRYPTION_KEY: active,
      METALAYER_ENCRYPTION_KEY_VERSION: '2',
      METALAYER_ENCRYPTION_PREVIOUS_KEYS: `1:${previous}`,
    });
    expect(ring.activeVersion).toBe(2);
    expect(ring.keys.size).toBe(2);

    const envelope = encryptSecret('from-env', ring);
    expect(envelope.startsWith('v1:2:')).toBe(true);
    expect(decryptSecret(envelope, ring)).toBe('from-env');
  });
});

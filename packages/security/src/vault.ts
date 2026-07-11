import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const CURRENT_KEY_VERSION = 1;
const ENVELOPE_PREFIX = 'v1';

export class VaultKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultKeyError';
  }
}

export function parseEncryptionKey(raw: string | undefined): Buffer {
  if (!raw || !raw.trim()) {
    throw new VaultKeyError('METALAYER_ENCRYPTION_KEY is required');
  }
  const value = raw.trim();
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    key = Buffer.from(value, 'hex');
  } else {
    key = Buffer.from(value, 'base64');
  }
  if (key.length !== KEY_LENGTH) {
    throw new VaultKeyError('METALAYER_ENCRYPTION_KEY must decode to 32 bytes');
  }
  return key;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

/**
 * Encrypt a UTF-8 secret for Secret Vault storage.
 */
export function encryptSecret(plaintext: string, key: Buffer, keyVersion = CURRENT_KEY_VERSION): string {
  if (!plaintext) {
    throw new VaultKeyError('plaintext secret must not be empty');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_PREFIX,
    String(keyVersion),
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(ciphertext),
  ].join(':');
}

/**
 * Decrypt a Secret Vault envelope produced by encryptSecret.
 */
export function decryptSecret(envelope: string, key: Buffer): string {
  const parts = envelope.split(':');
  if (parts.length !== 5 || parts[0] !== ENVELOPE_PREFIX) {
    throw new VaultKeyError('invalid secret envelope');
  }
  const [, , ivB64, tagB64, dataB64] = parts;
  const iv = fromBase64Url(ivB64);
  const tag = fromBase64Url(tagB64);
  const data = fromBase64Url(dataB64);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_LEN = 16;

/**
 * Hash an edit credential for storage. Format: scrypt:<salt>:<hash> (base64url).
 */
export function hashEditCredential(credential: string): string {
  if (!credential || credential.length < 8) {
    throw new VaultKeyError('edit credential must be at least 8 characters');
  }
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const hash = scryptSync(credential, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

export function verifyEditCredential(credential: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = fromBase64Url(parts[1]);
  const expected = fromBase64Url(parts[2]);
  const actual = scryptSync(credential, salt, expected.length, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export function generateConfigId(): string {
  return `ml_${toBase64Url(randomBytes(18))}`;
}

export function generateVaultEntryId(): string {
  return `sec_${toBase64Url(randomBytes(16))}`;
}

export function generateRevisionId(): string {
  return `rev_${toBase64Url(randomBytes(12))}`;
}

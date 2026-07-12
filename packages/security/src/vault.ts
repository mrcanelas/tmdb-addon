import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
/** Default active key version when only METALAYER_ENCRYPTION_KEY is set. */
export const DEFAULT_KEY_VERSION = 1;
const ENVELOPE_PREFIX = 'v1';

export class VaultKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultKeyError';
  }
}

/**
 * Multi-version encryption key ring for Secret Vault rotation (AGENTS.md §23.4).
 * Encrypt always uses `activeVersion`; decrypt selects the key by envelope version.
 */
export interface EncryptionKeyRing {
  activeVersion: number;
  keys: ReadonlyMap<number, Buffer>;
}

export interface ParsedSecretEnvelope {
  format: 'v1';
  keyVersion: number;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
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

function isKeyRing(value: Buffer | EncryptionKeyRing): value is EncryptionKeyRing {
  return !Buffer.isBuffer(value);
}

/**
 * Build a ring from an active key plus optional previous version keys.
 */
export function createEncryptionKeyRing(
  activeKey: Buffer,
  activeVersion = DEFAULT_KEY_VERSION,
  previous: Iterable<readonly [number, Buffer]> = [],
): EncryptionKeyRing {
  if (!Number.isInteger(activeVersion) || activeVersion < 1) {
    throw new VaultKeyError('active key version must be a positive integer');
  }
  const keys = new Map<number, Buffer>();
  for (const [version, key] of previous) {
    if (!Number.isInteger(version) || version < 1) {
      throw new VaultKeyError(`invalid previous key version: ${version}`);
    }
    if (key.length !== KEY_LENGTH) {
      throw new VaultKeyError(`previous key version ${version} must be 32 bytes`);
    }
    keys.set(version, key);
  }
  keys.set(activeVersion, activeKey);
  return { activeVersion, keys };
}

/**
 * Accept a raw key string (legacy) or an existing ring.
 */
export function resolveEncryptionKeyRing(
  input: string | EncryptionKeyRing,
): EncryptionKeyRing {
  if (typeof input === 'string') {
    return createEncryptionKeyRing(parseEncryptionKey(input), DEFAULT_KEY_VERSION);
  }
  if (!input.keys.has(input.activeVersion)) {
    throw new VaultKeyError(
      `active key version ${input.activeVersion} is missing from the key ring`,
    );
  }
  return input;
}

/**
 * Parse operator env for active + previous keys.
 *
 * - METALAYER_ENCRYPTION_KEY — required active key (base64 or hex)
 * - METALAYER_ENCRYPTION_KEY_VERSION — optional active version (default 1)
 * - METALAYER_ENCRYPTION_PREVIOUS_KEYS — optional `version:key,...` (key base64 or hex)
 */
export function parseEncryptionKeyRingFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EncryptionKeyRing {
  const activeKey = parseEncryptionKey(env.METALAYER_ENCRYPTION_KEY);
  const versionRaw = env.METALAYER_ENCRYPTION_KEY_VERSION?.trim();
  const activeVersion = versionRaw
    ? Number.parseInt(versionRaw, 10)
    : DEFAULT_KEY_VERSION;
  if (!Number.isInteger(activeVersion) || activeVersion < 1) {
    throw new VaultKeyError(
      'METALAYER_ENCRYPTION_KEY_VERSION must be a positive integer',
    );
  }

  const previous: Array<[number, Buffer]> = [];
  const previousRaw = env.METALAYER_ENCRYPTION_PREVIOUS_KEYS?.trim();
  if (previousRaw) {
    for (const part of previousRaw.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(':');
      if (colon <= 0) {
        throw new VaultKeyError(
          'METALAYER_ENCRYPTION_PREVIOUS_KEYS entries must be version:key',
        );
      }
      const version = Number.parseInt(trimmed.slice(0, colon), 10);
      const keyMaterial = trimmed.slice(colon + 1);
      if (!Number.isInteger(version) || version < 1) {
        throw new VaultKeyError(
          `invalid previous key version in METALAYER_ENCRYPTION_PREVIOUS_KEYS: ${trimmed.slice(0, colon)}`,
        );
      }
      if (version === activeVersion) {
        throw new VaultKeyError(
          `previous key version ${version} collides with active version`,
        );
      }
      previous.push([version, parseEncryptionKey(keyMaterial)]);
    }
  }

  return createEncryptionKeyRing(activeKey, activeVersion, previous);
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function parseSecretEnvelope(envelope: string): ParsedSecretEnvelope {
  const parts = envelope.split(':');
  if (parts.length !== 5 || parts[0] !== ENVELOPE_PREFIX) {
    throw new VaultKeyError('invalid secret envelope');
  }
  const keyVersion = Number.parseInt(parts[1]!, 10);
  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new VaultKeyError('invalid secret envelope key version');
  }
  return {
    format: 'v1',
    keyVersion,
    iv: fromBase64Url(parts[2]!),
    tag: fromBase64Url(parts[3]!),
    ciphertext: fromBase64Url(parts[4]!),
  };
}

/**
 * Encrypt a UTF-8 secret for Secret Vault storage.
 * Pass a Buffer (legacy single key) or an EncryptionKeyRing (active version).
 */
export function encryptSecret(
  plaintext: string,
  keyOrRing: Buffer | EncryptionKeyRing,
  keyVersion?: number,
): string {
  if (!plaintext) {
    throw new VaultKeyError('plaintext secret must not be empty');
  }

  let key: Buffer;
  let version: number;
  if (isKeyRing(keyOrRing)) {
    version = keyOrRing.activeVersion;
    const active = keyOrRing.keys.get(version);
    if (!active) {
      throw new VaultKeyError(
        `active key version ${version} is missing from the key ring`,
      );
    }
    key = active;
  } else {
    key = keyOrRing;
    version = keyVersion ?? DEFAULT_KEY_VERSION;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_PREFIX,
    String(version),
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(ciphertext),
  ].join(':');
}

/**
 * Decrypt a Secret Vault envelope produced by encryptSecret.
 * With a key ring, the envelope keyVersion selects the decryption key.
 */
export function decryptSecret(
  envelope: string,
  keyOrRing: Buffer | EncryptionKeyRing,
): string {
  const parsed = parseSecretEnvelope(envelope);
  let key: Buffer;
  if (isKeyRing(keyOrRing)) {
    const found = keyOrRing.keys.get(parsed.keyVersion);
    if (!found) {
      throw new VaultKeyError(
        `no encryption key registered for envelope version ${parsed.keyVersion}`,
      );
    }
    key = found;
  } else {
    key = keyOrRing;
  }

  const decipher = createDecipheriv(ALGORITHM, key, parsed.iv);
  decipher.setAuthTag(parsed.tag);
  const plaintext = Buffer.concat([
    decipher.update(parsed.ciphertext),
    decipher.final(),
  ]);
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
  const salt = fromBase64Url(parts[1]!);
  const expected = fromBase64Url(parts[2]!);
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

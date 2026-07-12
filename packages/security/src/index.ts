export {
  VaultKeyError,
  DEFAULT_KEY_VERSION,
  parseEncryptionKey,
  createEncryptionKeyRing,
  resolveEncryptionKeyRing,
  parseEncryptionKeyRingFromEnv,
  parseSecretEnvelope,
  encryptSecret,
  decryptSecret,
  hashEditCredential,
  verifyEditCredential,
  generateConfigId,
  generateVaultEntryId,
  generateRevisionId,
  type EncryptionKeyRing,
  type ParsedSecretEnvelope,
} from './vault.js';

export {
  redactSensitive,
  isSensitiveKey,
  isSensitiveHeader,
  FASTIFY_LOG_REDACT_PATHS,
} from './redact.js';

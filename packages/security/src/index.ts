export {
  VaultKeyError,
  parseEncryptionKey,
  encryptSecret,
  decryptSecret,
  hashEditCredential,
  verifyEditCredential,
  generateConfigId,
  generateVaultEntryId,
  generateRevisionId,
} from './vault.js';

export {
  redactSensitive,
  isSensitiveKey,
  isSensitiveHeader,
  FASTIFY_LOG_REDACT_PATHS,
} from './redact.js';

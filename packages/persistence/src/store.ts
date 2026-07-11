import { DatabaseSync } from 'node:sqlite';
import type { MetaLayerConfig } from '@metalayer/config';
import {
  decryptSecret,
  encryptSecret,
  generateConfigId,
  generateVaultEntryId,
  hashEditCredential,
  parseEncryptionKey,
  verifyEditCredential,
} from '@metalayer/security';

export type SecretKind = 'api_key' | 'oauth_access' | 'oauth_refresh' | 'session';

export type SecretCredentialState = 'connected' | 'not_configured';

export interface StoredConfiguration {
  configId: string;
  config: MetaLayerConfig;
  createdAt: string;
  updatedAt: string;
}

export interface PublicConfigurationView {
  configId: string;
  config: MetaLayerConfig;
  secrets: Record<string, SecretCredentialState>;
  manifestPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigurationInput {
  config: MetaLayerConfig;
  editCredential: string;
  secrets?: Record<string, string>;
}

export interface ConfigurationStore {
  create(input: CreateConfigurationInput): PublicConfigurationView;
  getPublic(configId: string): PublicConfigurationView | null;
  verifyEditAccess(configId: string, editCredential: string): boolean;
  getSecretPlaintext(configId: string, provider: string): string | null;
  listSecretStates(configId: string): Record<string, SecretCredentialState>;
  close(): void;
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS configurations (
      config_id TEXT PRIMARY KEY NOT NULL,
      edit_credential_hash TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_secrets (
      id TEXT PRIMARY KEY NOT NULL,
      config_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      kind TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      key_version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(config_id, provider, kind),
      FOREIGN KEY(config_id) REFERENCES configurations(config_id) ON DELETE CASCADE
    );
  `);
}

/**
 * Lite persistence using Node's built-in SQLite (no native addon compile step).
 * ADR 0005 — suitable for MetaLayer Lite; Server mode may switch to Postgres later.
 */
export class SqliteConfigurationStore implements ConfigurationStore {
  private readonly db: DatabaseSync;
  private readonly key: Buffer;

  constructor(options: { sqlitePath: string; encryptionKey: string }) {
    this.key = parseEncryptionKey(options.encryptionKey);
    this.db = new DatabaseSync(options.sqlitePath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    ensureSchema(this.db);
  }

  create(input: CreateConfigurationInput): PublicConfigurationView {
    const configId = generateConfigId();
    const now = new Date().toISOString();
    const editHash = hashEditCredential(input.editCredential);
    const config: MetaLayerConfig = {
      ...input.config,
      updatedAt: now,
      createdAt: input.config.createdAt || now,
    };

    const insertConfig = this.db.prepare(`
      INSERT INTO configurations (config_id, edit_credential_hash, config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertSecret = this.db.prepare(`
      INSERT INTO vault_secrets (id, config_id, provider, kind, ciphertext, key_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.exec('BEGIN');
    try {
      insertConfig.run(configId, editHash, JSON.stringify(config), now, now);

      for (const [provider, plaintext] of Object.entries(input.secrets ?? {})) {
        if (!plaintext) continue;
        const envelope = encryptSecret(plaintext, this.key);
        insertSecret.run(
          generateVaultEntryId(),
          configId,
          provider,
          'api_key',
          envelope,
          1,
          now,
          now,
        );
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return this.getPublic(configId)!;
  }

  getPublic(configId: string): PublicConfigurationView | null {
    const row = this.db
      .prepare(
        `SELECT config_id, config_json, created_at, updated_at
         FROM configurations WHERE config_id = ?`,
      )
      .get(configId) as
      | { config_id: string; config_json: string; created_at: string; updated_at: string }
      | undefined;

    if (!row) return null;

    return {
      configId: row.config_id,
      config: JSON.parse(row.config_json) as MetaLayerConfig,
      secrets: this.listSecretStates(configId),
      manifestPath: `/c/${row.config_id}/manifest.json`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  verifyEditAccess(configId: string, editCredential: string): boolean {
    const row = this.db
      .prepare(`SELECT edit_credential_hash FROM configurations WHERE config_id = ?`)
      .get(configId) as { edit_credential_hash: string } | undefined;
    if (!row) return false;
    return verifyEditCredential(editCredential, row.edit_credential_hash);
  }

  getSecretPlaintext(configId: string, provider: string): string | null {
    const row = this.db
      .prepare(
        `SELECT ciphertext FROM vault_secrets
         WHERE config_id = ? AND provider = ? AND kind = 'api_key'`,
      )
      .get(configId, provider) as { ciphertext: string } | undefined;
    if (!row) return null;
    return decryptSecret(row.ciphertext, this.key);
  }

  listSecretStates(configId: string): Record<string, SecretCredentialState> {
    const rows = this.db
      .prepare(`SELECT provider FROM vault_secrets WHERE config_id = ?`)
      .all(configId) as Array<{ provider: string }>;
    const states: Record<string, SecretCredentialState> = {};
    for (const row of rows) {
      states[row.provider] = 'connected';
    }
    return states;
  }

  close(): void {
    this.db.close();
  }
}

/** In-memory SQLite for tests. */
export function createMemoryConfigurationStore(encryptionKey: string): SqliteConfigurationStore {
  return new SqliteConfigurationStore({
    sqlitePath: ':memory:',
    encryptionKey,
  });
}

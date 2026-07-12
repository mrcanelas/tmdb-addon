import pg from 'pg';
import type { MetaLayerConfig } from '@metalayer/config';
import {
  decryptSecret,
  encryptSecret,
  generateConfigId,
  generateRevisionId,
  generateVaultEntryId,
  hashEditCredential,
  parseEncryptionKey,
  verifyEditCredential,
} from '@metalayer/security';
import type {
  ConfigurationRevision,
  ConfigurationRevisionSummary,
  ConfigurationStore,
  CreateConfigurationInput,
  PublicConfigurationView,
  SafeConfigurationExport,
  SecretCredentialState,
  SecretKind,
  UpdateConfigurationInput,
} from './store.js';

const { Pool } = pg;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS configurations (
  config_id TEXT PRIMARY KEY NOT NULL,
  edit_credential_hash TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_secrets (
  id TEXT PRIMARY KEY NOT NULL,
  config_id TEXT NOT NULL REFERENCES configurations(config_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  kind TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(config_id, provider, kind)
);

CREATE TABLE IF NOT EXISTS configuration_revisions (
  revision_id TEXT PRIMARY KEY NOT NULL,
  config_id TEXT NOT NULL REFERENCES configurations(config_id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  note TEXT,
  UNIQUE(config_id, revision_number)
);
`;

/**
 * Server persistence using PostgreSQL (same logical schema as SQLite Lite store).
 */
export class PostgresConfigurationStore implements ConfigurationStore {
  private readonly pool: pg.Pool;
  private readonly key: Buffer;

  private constructor(pool: pg.Pool, encryptionKey: string) {
    this.pool = pool;
    this.key = parseEncryptionKey(encryptionKey);
  }

  static async connect(options: {
    connectionString: string;
    encryptionKey: string;
  }): Promise<PostgresConfigurationStore> {
    const pool = new Pool({ connectionString: options.connectionString });
    const store = new PostgresConfigurationStore(pool, options.encryptionKey);
    await store.ensureSchema();
    return store;
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
  }

  private async nextRevisionNumber(
    client: pg.PoolClient,
    configId: string,
  ): Promise<number> {
    const result = await client.query<{ max_rev: string | number }>(
      `SELECT COALESCE(MAX(revision_number), 0) AS max_rev
       FROM configuration_revisions WHERE config_id = $1`,
      [configId],
    );
    return Number(result.rows[0]?.max_rev ?? 0) + 1;
  }

  private async insertRevision(
    client: pg.PoolClient,
    configId: string,
    config: MetaLayerConfig,
    createdAt: string,
    note?: string,
  ): Promise<void> {
    const revisionNumber = await this.nextRevisionNumber(client, configId);
    await client.query(
      `INSERT INTO configuration_revisions
       (revision_id, config_id, revision_number, config_json, created_at, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateRevisionId(),
        configId,
        revisionNumber,
        JSON.stringify(config),
        createdAt,
        note ?? null,
      ],
    );
  }

  private async upsertSecrets(
    client: pg.PoolClient,
    configId: string,
    secrets: Record<string, string> | undefined,
    now: string,
  ): Promise<void> {
    if (!secrets) return;
    for (const [provider, plaintext] of Object.entries(secrets)) {
      if (!plaintext) continue;
      const envelope = encryptSecret(plaintext, this.key);
      await client.query(
        `INSERT INTO vault_secrets
         (id, config_id, provider, kind, ciphertext, key_version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (config_id, provider, kind) DO UPDATE SET
           ciphertext = EXCLUDED.ciphertext,
           key_version = EXCLUDED.key_version,
           updated_at = EXCLUDED.updated_at`,
        [
          generateVaultEntryId(),
          configId,
          provider,
          'api_key',
          envelope,
          1,
          now,
          now,
        ],
      );
    }
  }

  async create(input: CreateConfigurationInput): Promise<PublicConfigurationView> {
    const configId = generateConfigId();
    const now = new Date().toISOString();
    const editHash = hashEditCredential(input.editCredential);
    const config: MetaLayerConfig = {
      ...input.config,
      updatedAt: now,
      createdAt: input.config.createdAt || now,
    };

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO configurations
         (config_id, edit_credential_hash, config_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [configId, editHash, JSON.stringify(config), now, now],
      );
      await this.upsertSecrets(client, configId, input.secrets, now);
      await this.insertRevision(client, configId, config, now, 'initial');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return (await this.getPublic(configId))!;
  }

  async update(
    configId: string,
    input: UpdateConfigurationInput,
  ): Promise<PublicConfigurationView | null> {
    const existing = await this.getPublic(configId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const config: MetaLayerConfig = {
      ...input.config,
      createdAt: existing.config.createdAt,
      updatedAt: now,
    };

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE configurations
         SET config_json = $1, updated_at = $2
         WHERE config_id = $3`,
        [JSON.stringify(config), now, configId],
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      await this.upsertSecrets(client, configId, input.secrets, now);
      await this.insertRevision(client, configId, config, now, input.note);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.getPublic(configId);
  }

  async getPublic(configId: string): Promise<PublicConfigurationView | null> {
    const result = await this.pool.query<{
      config_id: string;
      config_json: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT config_id, config_json, created_at, updated_at
       FROM configurations WHERE config_id = $1`,
      [configId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      configId: row.config_id,
      config: JSON.parse(row.config_json) as MetaLayerConfig,
      secrets: await this.listSecretStates(configId),
      manifestPath: `/c/${row.config_id}/manifest.json`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listConfigIds(): Promise<string[]> {
    const result = await this.pool.query<{ config_id: string }>(
      `SELECT config_id FROM configurations ORDER BY created_at ASC`,
    );
    return result.rows.map((row) => row.config_id);
  }

  async verifyEditAccess(
    configId: string,
    editCredential: string,
  ): Promise<boolean> {
    const result = await this.pool.query<{ edit_credential_hash: string }>(
      `SELECT edit_credential_hash FROM configurations WHERE config_id = $1`,
      [configId],
    );
    const row = result.rows[0];
    if (!row) return false;
    return verifyEditCredential(editCredential, row.edit_credential_hash);
  }

  async getSecretPlaintext(
    configId: string,
    provider: string,
    kind: SecretKind = 'api_key',
  ): Promise<string | null> {
    const result = await this.pool.query<{ ciphertext: string }>(
      `SELECT ciphertext FROM vault_secrets
       WHERE config_id = $1 AND provider = $2 AND kind = $3`,
      [configId, provider, kind],
    );
    const row = result.rows[0];
    if (!row) {
      if (kind === 'oauth_refresh') {
        return this.getSecretPlaintext(configId, `${provider}_refresh`, 'api_key');
      }
      if (kind === 'oauth_access') {
        return this.getSecretPlaintext(configId, provider, 'api_key');
      }
      return null;
    }
    return decryptSecret(row.ciphertext, this.key);
  }

  async upsertVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
    plaintext: string,
  ): Promise<boolean> {
    if (!plaintext) return false;
    const existing = await this.getPublic(configId);
    if (!existing) return false;
    const now = new Date().toISOString();
    const envelope = encryptSecret(plaintext, this.key);
    await this.pool.query(
      `INSERT INTO vault_secrets
       (id, config_id, provider, kind, ciphertext, key_version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (config_id, provider, kind) DO UPDATE SET
         ciphertext = EXCLUDED.ciphertext,
         key_version = EXCLUDED.key_version,
         updated_at = EXCLUDED.updated_at`,
      [
        generateVaultEntryId(),
        configId,
        provider,
        kind,
        envelope,
        1,
        now,
        now,
      ],
    );
    return true;
  }

  async deleteVaultSecret(
    configId: string,
    provider: string,
    kind: SecretKind,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM vault_secrets WHERE config_id = $1 AND provider = $2 AND kind = $3`,
      [configId, provider, kind],
    );
    return Number(result.rowCount ?? 0) > 0;
  }

  async listSecretStates(
    configId: string,
  ): Promise<Record<string, SecretCredentialState>> {
    const result = await this.pool.query<{ provider: string }>(
      `SELECT provider FROM vault_secrets WHERE config_id = $1`,
      [configId],
    );
    const states: Record<string, SecretCredentialState> = {};
    for (const row of result.rows) {
      states[row.provider] = 'connected';
    }
    return states;
  }

  async listRevisions(configId: string): Promise<ConfigurationRevisionSummary[]> {
    const result = await this.pool.query<{
      revision_id: string;
      revision_number: number;
      created_at: string;
      note: string | null;
    }>(
      `SELECT revision_id, revision_number, created_at, note
       FROM configuration_revisions
       WHERE config_id = $1
       ORDER BY revision_number DESC`,
      [configId],
    );

    return result.rows.map((row) => ({
      revisionId: row.revision_id,
      revisionNumber: row.revision_number,
      createdAt: row.created_at,
      note: row.note ?? undefined,
    }));
  }

  async getRevision(
    configId: string,
    revisionId: string,
  ): Promise<ConfigurationRevision | null> {
    const result = await this.pool.query<{
      revision_id: string;
      revision_number: number;
      config_json: string;
      created_at: string;
      note: string | null;
    }>(
      `SELECT revision_id, revision_number, config_json, created_at, note
       FROM configuration_revisions
       WHERE config_id = $1 AND revision_id = $2`,
      [configId, revisionId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      revisionId: row.revision_id,
      revisionNumber: row.revision_number,
      createdAt: row.created_at,
      note: row.note ?? undefined,
      config: JSON.parse(row.config_json) as MetaLayerConfig,
    };
  }

  async restoreRevision(
    configId: string,
    revisionId: string,
    note?: string,
  ): Promise<PublicConfigurationView | null> {
    const revision = await this.getRevision(configId, revisionId);
    if (!revision) return null;
    return this.update(configId, {
      config: revision.config,
      note: note ?? `restored from revision ${revision.revisionNumber}`,
    });
  }

  async exportSafe(configId: string): Promise<SafeConfigurationExport | null> {
    const view = await this.getPublic(configId);
    if (!view) return null;
    return {
      format: 'metalayer-config-export',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      configId: view.configId,
      config: view.config,
      secrets: view.secrets,
      includesSecrets: false,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

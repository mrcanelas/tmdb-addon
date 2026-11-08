import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressToEncodedURIComponent } from '@metalayer/config';
import { buildApp } from './app.js';
import { createMemoryConfigurationStore } from '@metalayer/persistence';

const TEST_KEY = Buffer.alloc(32, 11).toString('base64');
const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../tests/fixtures/legacy',
);

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

const DRY_RUN_FIXTURES = [
  'language-only.json',
  'language-catalogs.json',
  'trakt-lists.json',
  'mdblist-catalog.json',
  'rpdb-posters.json',
  'ai-search.json',
  'age-rating-options.json',
  'trakt-access-only.json',
  'full-with-secrets.json',
] as const;

describe('@metalayer/server legacy import', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('previews a legacy import without persisting secrets', async () => {
    const app = await appPromise;
    const fixture = loadFixture('full-with-secrets.json');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations/import-legacy',
      payload: {
        dryRun: true,
        legacy: fixture,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dryRun).toBe(true);
    expect(body.report.secretsToVault).toEqual(expect.arrayContaining(['tmdb', 'trakt']));
    expect(body.config.catalogs.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain('REDACTED_TMDB_KEY');
    expect(await store.getPublic('missing')).toBeNull();
  });

  it.each(DRY_RUN_FIXTURES)('dry-runs fixture %s without leaking secrets', async (fixtureName) => {
    const app = await appPromise;
    const fixture = loadFixture(fixtureName);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations/import-legacy',
      payload: {
        dryRun: true,
        legacy: fixture,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dryRun).toBe(true);
    expect(body.report).toBeDefined();
    expect(body.config).toBeDefined();
    expect(body.secrets).toBeUndefined();

    const serialized = JSON.stringify(body);
    for (const value of Object.values(fixture)) {
      if (typeof value === 'string' && value.startsWith('REDACTED_')) {
        expect(serialized).not.toContain(value);
      }
    }
  });

  it('returns LEGACY_IMPORT_FAILED for malformed catalogs', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations/import-legacy',
      payload: {
        dryRun: true,
        legacy: loadFixture('malformed-catalogs.json'),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('LEGACY_IMPORT_FAILED');
  });

  it('persists imported legacy config with vaulted secrets and native manifest path', async () => {
    const app = await appPromise;
    const fixture = loadFixture('language-catalogs.json');
    const compressed = compressToEncodedURIComponent(JSON.stringify(fixture));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations/import-legacy',
      payload: {
        name: 'From URL',
        editCredential: 'import-edit-credential',
        legacy: compressed,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.configId).toMatch(/^ml_/);
    expect(body.manifestPath).toBe(`/c/${body.configId}/manifest.json`);
    expect(body.config.localization.contentRegion).toBe('BR');
    expect(body.report.imported).toEqual(expect.arrayContaining(['catalogs', 'language']));
    expect(JSON.stringify(body)).not.toMatch(/editCredential|REDACTED/);

    const manifest = await app.inject({ method: 'GET', url: body.manifestPath });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.json().id).toBe('community.metalayer');
  });

  it('persists secrets from full legacy fixture into the vault', async () => {
    const app = await appPromise;
    const fixture = loadFixture('full-with-secrets.json');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations/import-legacy',
      payload: {
        name: 'Secrets Import',
        editCredential: 'import-secrets-credential',
        legacy: fixture,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.configId).toMatch(/^ml_/);
    expect(body.report.secretsToVault).toEqual(
      expect.arrayContaining(['tmdb', 'trakt', 'mdblist', 'rpdb', 'gemini', 'tmdb_session']),
    );
    expect(JSON.stringify(body)).not.toContain('REDACTED_TMDB_KEY');
    expect(JSON.stringify(body)).not.toContain('REDACTED_TRAKT_TOKEN');

    expect(await store.getSecretPlaintext(body.configId, 'tmdb', 'api_key')).toBe(
      'REDACTED_TMDB_KEY',
    );
    expect(await store.getSecretPlaintext(body.configId, 'trakt', 'oauth_access')).toBe(
      'REDACTED_TRAKT_TOKEN',
    );
    expect(await store.getSecretPlaintext(body.configId, 'mdblist', 'api_key')).toBe(
      'REDACTED_MDBLIST_KEY',
    );
    expect(await store.getSecretPlaintext(body.configId, 'rpdb', 'api_key')).toBe(
      'REDACTED_RPDB_KEY',
    );

    const manifest = await app.inject({ method: 'GET', url: body.manifestPath });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.json().id).toBe('community.metalayer');
  });
});

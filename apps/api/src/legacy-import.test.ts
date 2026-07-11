import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressToEncodedURIComponent } from 'lz-string';
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

describe('@metalayer/api legacy import', () => {
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
    expect(store.getPublic('missing')).toBeNull();
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
});

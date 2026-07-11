import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from './lz-string.js';
import { planLegacyImport, toPublicImportPlan } from './legacy-import.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../tests/fixtures/legacy',
);

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

describe('legacy import planner', () => {
  it('maps catalogs and moves secrets to vault providers without leaking values in public plan', () => {
    const fixture = loadFixture('full-with-secrets.json');
    const plan = planLegacyImport(fixture, { name: 'Migrated' });

    expect(plan.config.name).toBe('Migrated');
    expect(plan.config.localization.metadataLocale).toBe('en-US');
    expect(plan.config.catalogs).toHaveLength(2);
    expect(plan.config.catalogs[0].provider).toBe('tmdb');
    expect(plan.secrets.tmdb).toBe('REDACTED_TMDB_KEY');
    expect(plan.secrets.trakt).toBe('REDACTED_TRAKT_TOKEN');
    expect(plan.report.secretsToVault).toEqual(
      expect.arrayContaining(['tmdb', 'trakt', 'mdblist', 'rpdb', 'gemini', 'tmdb_session']),
    );
    expect(plan.report.imported).toEqual(expect.arrayContaining(['catalogs', 'secrets']));

    const publicPlan = toPublicImportPlan(plan);
    expect(JSON.stringify(publicPlan)).not.toContain('REDACTED_TMDB_KEY');
    expect(JSON.stringify(publicPlan)).not.toContain('REDACTED_TRAKT_TOKEN');
  });

  it('accepts lz-string compressed legacy URL payloads', () => {
    const fixture = loadFixture('language-catalogs.json');
    const compressed = compressToEncodedURIComponent(JSON.stringify(fixture));
    const plan = planLegacyImport(compressed);

    expect(plan.config.localization.interfaceLocale).toBe('pt-BR');
    expect(plan.config.localization.contentRegion).toBe('BR');
    expect(plan.config.catalogs[0].providerCatalogId).toBe('popular');
  });

  it('flags trakt access without refresh token', () => {
    const plan = planLegacyImport({
      language: 'en-US',
      traktAccessToken: 'access-only',
    });
    expect(plan.report.needsAttention.some((item) => item.code === 'TRAKT_REFRESH_MISSING')).toBe(
      true,
    );
  });
});

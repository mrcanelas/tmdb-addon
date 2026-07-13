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

function assertNoSecretLeak(value: unknown, forbidden: string[]) {
  const serialized = JSON.stringify(value);
  for (const secret of forbidden) {
    expect(serialized).not.toContain(secret);
  }
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
    expect(plan.report.needsAttention.some((item) => item.code === 'TRAKT_REFRESH_MISSING')).toBe(
      true,
    );

    const publicPlan = toPublicImportPlan(plan);
    assertNoSecretLeak(publicPlan, [
      'REDACTED_TMDB_KEY',
      'REDACTED_TRAKT_TOKEN',
      'REDACTED_MDBLIST_KEY',
      'REDACTED_RPDB_KEY',
      'REDACTED_GEMINI_KEY',
      'REDACTED_SESSION',
    ]);
  });

  it('accepts lz-string compressed legacy URL payloads', () => {
    const fixture = loadFixture('language-catalogs.json');
    const compressed = compressToEncodedURIComponent(JSON.stringify(fixture));
    const plan = planLegacyImport(compressed);

    expect(plan.config.localization.interfaceLocale).toBe('pt-BR');
    expect(plan.config.localization.contentRegion).toBe('BR');
    expect(plan.config.catalogs[0].providerCatalogId).toBe('popular');
  });

  it('accepts language-only string payloads', () => {
    const plan = planLegacyImport('pt-BR');
    expect(plan.config.localization.interfaceLocale).toBe('pt-BR');
    expect(plan.config.localization.metadataLocale).toBe('pt-BR');
    expect(plan.config.localization.contentRegion).toBe('BR');
    expect(plan.report.imported).toEqual(expect.arrayContaining(['language', 'region']));
  });

  it.each([
    {
      fixture: 'language-only.json',
      expectImported: ['language', 'region'],
      expectSecrets: [] as string[],
      locale: 'pt-BR',
      region: 'BR',
      catalogCount: 0,
    },
    {
      fixture: 'language-catalogs.json',
      expectImported: ['language', 'region', 'catalogs', 'search'],
      expectSecrets: [] as string[],
      locale: 'pt-BR',
      region: 'BR',
      catalogCount: 2,
    },
    {
      fixture: 'trakt-lists.json',
      expectImported: ['catalogs', 'secrets'],
      expectSecrets: ['trakt', 'trakt_refresh'],
      locale: 'en-US',
      region: 'US',
      catalogCount: 2,
      catalogProviders: ['trakt', 'trakt'],
    },
    {
      fixture: 'mdblist-catalog.json',
      expectImported: ['catalogs', 'secrets'],
      expectSecrets: ['mdblist'],
      locale: 'en-US',
      region: 'US',
      catalogCount: 1,
      catalogProviders: ['mdblist'],
    },
    {
      fixture: 'rpdb-posters.json',
      expectImported: ['catalogs', 'secrets', 'tmdbPrefix'],
      expectSecrets: ['rpdb'],
      locale: 'pt-BR',
      region: 'BR',
      catalogCount: 1,
    },
    {
      fixture: 'ai-search.json',
      expectImported: ['catalogs', 'secrets', 'search'],
      expectSecrets: ['gemini', 'groq'],
      locale: 'en-US',
      region: 'US',
      catalogCount: 2,
    },
    {
      fixture: 'age-rating-options.json',
      expectImported: ['ageRating', 'enableAgeRating', 'castCount'],
      expectSecrets: [] as string[],
      locale: 'en-US',
      region: 'US',
      catalogCount: 0,
    },
    {
      fixture: 'trakt-access-only.json',
      expectImported: ['secrets'],
      expectSecrets: ['trakt'],
      locale: 'en-US',
      region: 'US',
      catalogCount: 0,
      attentionCodes: ['TRAKT_REFRESH_MISSING'],
    },
  ])(
    'plans fixture $fixture into MetaLayer config',
    ({
      fixture,
      expectImported,
      expectSecrets,
      locale,
      region,
      catalogCount,
      catalogProviders,
      attentionCodes,
    }) => {
      const plan = planLegacyImport(loadFixture(fixture));

      expect(plan.config.localization.interfaceLocale).toBe(locale);
      expect(plan.config.localization.metadataLocale).toBe(locale);
      expect(plan.config.localization.contentRegion).toBe(region);
      expect(plan.config.catalogs).toHaveLength(catalogCount);
      expect(plan.report.imported).toEqual(expect.arrayContaining(expectImported));
      expect(plan.report.secretsToVault).toEqual(expect.arrayContaining(expectSecrets));
      expect(plan.report.secretsToVault).toHaveLength(expectSecrets.length);

      if (catalogProviders) {
        expect(plan.config.catalogs.map((catalog) => catalog.provider)).toEqual(
          catalogProviders,
        );
      }

      if (attentionCodes) {
        for (const code of attentionCodes) {
          expect(plan.report.needsAttention.some((item) => item.code === code)).toBe(true);
        }
      }

      const forbidden = Object.values(plan.secrets);
      assertNoSecretLeak(toPublicImportPlan(plan), forbidden);
    },
  );

  it('rejects malformed catalogs shape', () => {
    expect(() => planLegacyImport(loadFixture('malformed-catalogs.json'))).toThrow();
  });
});

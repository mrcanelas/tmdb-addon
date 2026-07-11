import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertEmptyCatalogResponse,
  assertNotFakeErrorCatalog,
  CatalogResponseSchema,
  LegacyManifestSchema,
  LegacySyntheticEmptyCatalogSchema,
  MetaResponseSchema,
  parseLegacyAddonConfig,
  listLegacySecretsPresent,
} from '../../packages/config/src/index.ts';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LEGACY } = require('../../packages/identity/src/index.js');

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/legacy');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

describe('legacy Stremio protocol contracts', () => {
  it('validates default manifest fixture against legacy identity', () => {
    const manifest = LegacyManifestSchema.parse(loadFixture('manifest-default.json'));
    expect(manifest.id).toBe(LEGACY.manifestId);
    expect(manifest.version).toBe(LEGACY.manifestVersion);
    expect(manifest.resources).toEqual(expect.arrayContaining(['catalog', 'meta']));
    expect(manifest.types).toEqual(['movie', 'series']);
  });

  it('validates populated catalog fixture', () => {
    const catalog = CatalogResponseSchema.parse(loadFixture('catalog-populated.json'));
    expect(catalog.metas).toHaveLength(2);
    expect(catalog.metas[0].id).toMatch(/^tmdb:/);
    expect(() => assertNotFakeErrorCatalog(catalog)).not.toThrow();
  });

  it('validates movie and series meta fixtures', () => {
    const movie = MetaResponseSchema.parse(loadFixture('meta-movie.json'));
    const series = MetaResponseSchema.parse(loadFixture('meta-series.json'));
    expect(movie.meta.type).toBe('movie');
    expect(series.meta.type).toBe('series');
    expect(series.meta.seasons?.length).toBeGreaterThan(0);
  });

  it('documents legacy synthetic empty/error catalog cards', () => {
    const empty = LegacySyntheticEmptyCatalogSchema.parse(
      loadFixture('catalog-synthetic-empty.json'),
    );
    const errorCard = LegacySyntheticEmptyCatalogSchema.parse(
      loadFixture('catalog-synthetic-error.json'),
    );
    expect(empty.metas[0].name).toBe('No Content Available');
    expect(errorCard.metas[0].name).toMatch(/Error/i);
  });

  it('requires MetaLayer empty catalogs to be { metas: [] }', () => {
    expect(assertEmptyCatalogResponse(loadFixture('catalog-empty-metalayer.json'))).toEqual({
      metas: [],
    });
    expect(() => assertNotFakeErrorCatalog(loadFixture('catalog-synthetic-empty.json'))).toThrow(
      /Fake error\/empty meta card|Error represented as media card/,
    );
    expect(() => assertNotFakeErrorCatalog(loadFixture('catalog-synthetic-error.json'))).toThrow(
      /Fake error\/empty meta card|Error represented as media card/,
    );
  });
});

describe('legacy AI search config fixture', () => {
  it('parses AI search catalogs and lists secret keys without values', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('ai-search.json'));
    expect(fixture.catalogs?.map((c) => c.id)).toEqual(['tmdb.search', 'tmdb.aisearch']);
    expect(listLegacySecretsPresent(fixture)).toEqual(
      expect.arrayContaining(['geminikey', 'groqkey']),
    );
  });
});

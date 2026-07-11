import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  assertEmptyCatalogResponse,
  LegacyManifestSchema,
  listLegacySecretsPresent,
  parseLegacyAddonConfig,
} from '../../packages/config/src/index.ts';

const require = createRequire(import.meta.url);
const { parseConfig } = require('../../addon/utils/parseProps.js');
const { LEGACY } = require('../../packages/identity/src/index.js');

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/legacy');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

describe('legacy provider fixtures', () => {
  it('parses trakt list config and flags OAuth secrets', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('trakt-lists.json'));
    expect(fixture.catalogs?.map((c) => c.id)).toEqual([
      'trakt.watchlist',
      'trakt.recommendations',
    ]);
    expect(listLegacySecretsPresent(fixture)).toEqual([
      'traktAccessToken',
      'traktRefreshToken',
    ]);
  });

  it('parses mdblist catalog config', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('mdblist-catalog.json'));
    expect(fixture.catalogs?.[0]?.id).toBe('mdblist.12345');
    expect(listLegacySecretsPresent(fixture)).toEqual(['mdblistkey']);
  });

  it('parses rpdb poster config', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('rpdb-posters.json'));
    expect(fixture.language).toBe('pt-BR');
    expect(listLegacySecretsPresent(fixture)).toEqual(['rpdbkey']);
  });

  it('rejects malformed catalogs shape on schema parse', () => {
    expect(() => parseLegacyAddonConfig(loadFixture('malformed-catalogs.json'))).toThrow();
  });

  it('round-trips trakt fixture through lz-string like a legacy URL segment', () => {
    const fixture = loadFixture('trakt-lists.json');
    const compressed = compressToEncodedURIComponent(JSON.stringify(fixture));
    const parsed = parseConfig(compressed);
    expect(parsed.traktAccessToken).toBe('REDACTED_TRAKT_ACCESS');
    expect(parsed.catalogs).toHaveLength(2);
  });
});

describe('legacy stremio response contracts', () => {
  it('validates default manifest fixture against legacy identity', () => {
    const manifest = LegacyManifestSchema.parse(loadFixture('manifest-default.json'));
    expect(manifest.id).toBe(LEGACY.manifestId);
    expect(manifest.version).toBe(LEGACY.manifestVersion);
    expect(manifest.resources).toEqual(expect.arrayContaining(['catalog', 'meta']));
    expect(manifest.types).toEqual(['movie', 'series']);
  });

  it('requires empty catalogs to be { metas: [] }', () => {
    expect(assertEmptyCatalogResponse({ metas: [] })).toEqual({ metas: [] });
    expect(() =>
      assertEmptyCatalogResponse({
        metas: [{ id: 'error', type: 'movie', name: 'Something went wrong' }],
      }),
    ).toThrow();
  });
});

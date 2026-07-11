import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
  listLegacySecretsPresent,
  parseLegacyAddonConfig,
} from '../../packages/config/src/index.ts';

const require = createRequire(import.meta.url);
const { parseConfig } = require('../../addon/utils/parseProps.js');
const { getActiveManifestIdentity, LEGACY } = require('../../packages/identity/src/index.js');

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/legacy');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

describe('legacy config contracts', () => {
  it('round-trips language + catalogs through lz-string like Stremio URLs', () => {
    const fixture = loadFixture('language-catalogs.json');
    const compressed = compressToEncodedURIComponent(JSON.stringify(fixture));
    const parsed = parseConfig(compressed);

    expect(parsed.language).toBe('pt-BR');
    expect(parsed.catalogs).toHaveLength(2);
    expect(parsed.catalogs[0].id).toBe('tmdb.popular');
    expect(decompressFromEncodedURIComponent(compressed)).toContain('pt-BR');
  });

  it('parses language-only legacy path as language fallback', () => {
    expect(parseConfig('pt-BR')).toEqual({ language: 'pt-BR' });
  });

  it('parses empty catalogChoices as empty object', () => {
    expect(parseConfig(undefined)).toEqual({});
    expect(parseConfig('')).toEqual({});
  });

  it('identifies secret-bearing legacy fields for vault migration', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('full-with-secrets.json'));
    const secrets = listLegacySecretsPresent(fixture);
    expect(secrets).toEqual(
      expect.arrayContaining([
        'tmdbApiKey',
        'sessionId',
        'traktAccessToken',
        'mdblistkey',
        'rpdbkey',
        'geminikey',
      ]),
    );
    expect(JSON.stringify(secrets)).not.toContain('REDACTED');
  });

  it('accepts age-rating legacy options fixture', () => {
    const fixture = parseLegacyAddonConfig(loadFixture('age-rating-options.json'));
    expect(fixture.ageRating).toBe('PG-13');
    expect(fixture.enableAgeRating).toBe('true');
  });
});

describe('legacy manifest identity contract', () => {
  it('exposes stable legacy manifest id and version without reading package.json', () => {
    const identity = getActiveManifestIdentity();
    expect(identity.id).toBe('tmdb-addon');
    expect(identity.name).toBe('The Movie Database Addon');
    expect(identity.version).toBe(LEGACY.manifestVersion);
    expect(identity.id).not.toBe('community.metalayer');
  });
});

import { describe, expect, it } from 'vitest';
import {
  createDefaultMetaLayerConfig,
  listLegacySecretsPresent,
  METALAYER_CONFIG_VERSION,
  parseLegacyAddonConfig,
  parseMetaLayerConfig,
} from './index.js';

describe('@metalayer/config', () => {
  it('creates a valid default MetaLayer config at version 1', () => {
    const config = createDefaultMetaLayerConfig({ name: 'Family' });
    expect(config.configVersion).toBe(METALAYER_CONFIG_VERSION);
    expect(config.name).toBe('Family');
    expect(config.localization.interfaceLocale).toBe('en-US');
    expect(config.identity.stremioPublicId).toBe('imdb');
    expect(config.presentation.catalogNamePrefix).toBe(false);
    expect(config.profiles).toEqual([]);
    expect(() => parseMetaLayerConfig(config)).not.toThrow();
  });

  it('rejects missing configVersion', () => {
    const config = createDefaultMetaLayerConfig();
    const { configVersion: _, ...invalid } = config;
    expect(() => parseMetaLayerConfig(invalid)).toThrow();
  });

  it('parses legacy configs and lists secrets without exposing values', () => {
    const legacy = parseLegacyAddonConfig({
      language: 'pt-BR',
      tmdbApiKey: 'secret-key',
      catalogs: [{ id: 'tmdb.popular', type: 'movie', showInHome: true }],
    });
    expect(legacy.language).toBe('pt-BR');
    expect(listLegacySecretsPresent(legacy)).toEqual(['tmdbApiKey']);
  });
});

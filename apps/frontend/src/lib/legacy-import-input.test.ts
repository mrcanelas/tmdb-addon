import { describe, expect, it } from 'vitest';
import { parseLegacyImportInput } from './api';

describe('parseLegacyImportInput', () => {
  it('parses JSON object text', () => {
    expect(parseLegacyImportInput('{"language":"pt-BR"}')).toEqual({
      language: 'pt-BR',
    });
  });

  it('passes through compressed or language-only strings', () => {
    expect(parseLegacyImportInput('pt-BR')).toBe('pt-BR');
  });

  it('rejects empty input', () => {
    expect(() => parseLegacyImportInput('   ')).toThrow('LEGACY_IMPORT_EMPTY');
  });
});

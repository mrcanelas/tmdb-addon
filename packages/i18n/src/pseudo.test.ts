import { describe, expect, it } from 'vitest';
import { toPseudoExpanded, toPseudoRtl, transformMessageCatalog } from './pseudo.js';

describe('pseudo-localization', () => {
  it('expands text for en-XA while preserving placeholders', () => {
    const result = toPseudoExpanded('Missing credentials for {{source}}.');
    expect(result).toContain('{{source}}');
    expect(result.length).toBeGreaterThan('Missing credentials for {{source}}.'.length);
  });

  it('wraps segments with RTL marks for ar-XB', () => {
    const result = toPseudoRtl('MetaLayer');
    expect(result.startsWith('\u200F')).toBe(true);
    expect(result.includes('MetaLayer')).toBe(true);
  });

  it('transforms full catalogs', () => {
    const catalog = transformMessageCatalog(
      { 'common.appName': 'MetaLayer' },
      'en-XA',
    );
    expect(catalog['common.appName']).not.toBe('MetaLayer');
  });
});

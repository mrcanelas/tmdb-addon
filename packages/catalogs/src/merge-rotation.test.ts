import { describe, expect, it } from 'vitest';
import {
  createMergedCatalog,
  createRotatedCatalog,
  exportCatalogDefinitions,
  importCatalogDefinitions,
  setCatalogGroup,
  setCatalogTags,
} from './studio-extra.js';
import { mergeMetas } from './merge.js';
import { pickRotationSource } from './rotation.js';
import { resolveCatalogResults } from './resolve.js';
import { createCatalogInstance } from './studio.js';
import type { CatalogMetaPreview } from './merge.js';

describe('@metalayer/catalogs merge and rotation', () => {
  const a: CatalogMetaPreview[] = [
    { id: '1', type: 'movie', name: 'One' },
    { id: '2', type: 'movie', name: 'Two' },
  ];
  const b: CatalogMetaPreview[] = [
    { id: '2', type: 'movie', name: 'Two again' },
    { id: '3', type: 'movie', name: 'Three' },
  ];

  it('merges with append, interleave, and dedupe-union', () => {
    expect(mergeMetas([{ metas: a }, { metas: b }], 'append').map((m) => m.id)).toEqual([
      '1',
      '2',
      '2',
      '3',
    ]);
    expect(mergeMetas([{ metas: a }, { metas: b }], 'interleave').map((m) => m.id)).toEqual([
      '1',
      '2',
      '2',
      '3',
    ]);
    expect(mergeMetas([{ metas: a }, { metas: b }], 'dedupe-union').map((m) => m.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('picks a stable rotation source by day', () => {
    const day = new Date('2026-07-12T12:00:00.000Z');
    const nextDay = new Date('2026-07-13T12:00:00.000Z');
    const sources = ['a', 'b', 'c'];
    const first = pickRotationSource(sources, 'daily', day);
    expect(pickRotationSource(sources, 'daily', day)).toBe(first);
    expect(pickRotationSource(sources, 'daily', nextDay)).toBe(
      sources[(sources.indexOf(first) + 1) % 3],
    );
  });

  it('resolves merged catalogs through leaf fetchers', async () => {
    let catalogs = [
      createCatalogInstance({
        provider: 'tmdb',
        providerCatalogId: 'trending',
        mediaType: 'movie',
        originalName: 'A',
      }),
      createCatalogInstance({
        provider: 'tmdb',
        providerCatalogId: 'popular',
        mediaType: 'movie',
        originalName: 'B',
      }),
    ];
    catalogs = catalogs.map((item, index) => ({ ...item, position: index }));
    catalogs = createMergedCatalog(catalogs, {
      name: 'Mix',
      mediaType: 'movie',
      mode: 'dedupe-union',
      sourceInstanceIds: [catalogs[0].instanceId, catalogs[1].instanceId],
    });

    const merged = catalogs.find((item) => item.merge)!;
    const result = await resolveCatalogResults(catalogs, merged.instanceId, async (catalog) => {
      if (catalog.providerCatalogId === 'trending') return a;
      return b;
    });

    expect(result.mode).toBe('merge');
    expect(result.metas.map((meta) => meta.id)).toEqual(['1', '2', '3']);
  });

  it('emits stable warning codes for missing instances and rotation', async () => {
    const leaf = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending',
    });
    const second = createCatalogInstance(
      {
        provider: 'tmdb',
        providerCatalogId: 'popular',
        mediaType: 'movie',
        originalName: 'Popular',
      },
      [leaf],
    );
    let catalogs = createRotatedCatalog([leaf, second], {
      name: 'Daily Mix',
      mediaType: 'movie',
      mode: 'daily',
      sourceInstanceIds: [leaf.instanceId, second.instanceId],
    });
    catalogs = catalogs.map((item, index) => ({ ...item, position: index }));

    const missing = await resolveCatalogResults(catalogs, 'missing-id', async () => []);
    expect(missing.warnings).toEqual([
      { code: 'INSTANCE_NOT_FOUND', params: { instanceId: 'missing-id' } },
    ]);

    const rotated = catalogs.find((item) => item.rotation)!;
    const result = await resolveCatalogResults(catalogs, rotated.instanceId, async () => [
      { id: '1', type: 'movie', name: 'One' },
    ]);
    expect(result.mode).toBe('rotation');
    expect(result.warnings.some((w) => w.code === 'ROTATION_ACTIVE')).toBe(true);
  });

  it('exports and imports catalog definitions with tags and rotation', () => {
    const leaf = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending',
    });
    const second = createCatalogInstance(
      {
        provider: 'tmdb',
        providerCatalogId: 'popular',
        mediaType: 'movie',
        originalName: 'Popular',
      },
      [leaf],
    );
    let catalogs = setCatalogTags([leaf, second], leaf.instanceId, ['featured']);
    catalogs = setCatalogGroup(catalogs, leaf.instanceId, 'Home');
    catalogs = createRotatedCatalog(catalogs, {
      name: 'Daily Mix',
      mediaType: 'movie',
      mode: 'daily',
      sourceInstanceIds: [leaf.instanceId, second.instanceId],
    });

    const exported = exportCatalogDefinitions(catalogs);
    expect(exported).toHaveLength(3);

    const imported = importCatalogDefinitions([], exported, 'replace');
    expect(imported).toHaveLength(3);
    expect(imported.some((item) => item.rotation)).toBe(true);
    expect(imported[0]?.tags).toContain('featured');
  });
});

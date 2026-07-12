import { describe, expect, it } from 'vitest';
import { resolveIdentityMapping } from '@metalayer/identity-graph';
import {
  CorrectionRegistry,
  applyEpisodeCorrectionsToVideos,
  applyMetadataCorrections,
  applyModeration,
  correctionsReferenceSpecialSeason,
  filterCorrectionsForIdentity,
  loadSampleCommunityCorrections,
  remapEpisode,
  resolveActiveCorrections,
  toIdentityCorrectionStubs,
  validateCorrection,
} from './index.js';

describe('@metalayer/corrections', () => {
  it('validates schema and rejects stream URLs', () => {
    const ok = validateCorrection({
      id: 'local-1',
      schemaVersion: 1,
      target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' },
      type: 'title_correction',
      payload: { title: 'Fight Club' },
      reason: 'Prefer canonical title',
      sources: [{ kind: 'manual', label: 'Operator note' }],
      status: 'local',
      scope: 'local',
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T00:00:00.000Z',
    });
    expect(ok.ok).toBe(true);

    const bad = validateCorrection({
      id: 'bad-stream',
      schemaVersion: 1,
      target: { provider: 'imdb', id: 'tt1' },
      type: 'artwork_override',
      payload: { kind: 'poster', url: 'https://cdn.example/stream.m3u8' },
      reason: 'nope',
      sources: [{ kind: 'manual', label: 'x' }],
      status: 'local',
      scope: 'local',
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T00:00:00.000Z',
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues.some((issue) => issue.code === 'FORBIDDEN_CONTENT')).toBe(true);
  });

  it('lets local overrides win over community for the same target+type', () => {
    const community = {
      id: 'c1',
      schemaVersion: 1 as const,
      target: { provider: 'imdb' as const, id: 'tt0137523', entityKind: 'movie' as const },
      type: 'title_correction' as const,
      payload: { title: 'Community Title' },
      reason: 'community',
      sources: [{ kind: 'community-file' as const, label: 'file' }],
      status: 'verified' as const,
      scope: 'community' as const,
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T00:00:00.000Z',
    };
    const local = {
      ...community,
      id: 'l1',
      payload: { title: 'Local Title' },
      status: 'local' as const,
      scope: 'local' as const,
      reason: 'local override',
      sources: [{ kind: 'manual' as const, label: 'mine' }],
    };

    const resolved = resolveActiveCorrections([local], [community]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.id).toBe('l1');

    const applied = applyMetadataCorrections({ title: 'Provider' }, resolved);
    expect(applied.value.title).toBe('Local Title');
    expect(applied.overlays[0]!.scope).toBe('local');
  });

  it('remaps episodes and bridges identity corrections', () => {
    const remap = remapEpisode(1, 0, [
      {
        id: 'ep1',
        schemaVersion: 1,
        target: { provider: 'tvdb', id: '73739', entityKind: 'series' },
        type: 'episode_reassignment',
        payload: {
          from: { season: 1, episode: 0 },
          to: { season: 0, episode: 1 },
        },
        reason: 'pilot',
        sources: [{ kind: 'test-fixture', label: 'fixture' }],
        status: 'verified',
        scope: 'community',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ]);
    expect(remap).toMatchObject({ season: 0, episode: 1, correctionId: 'ep1' });

    const stubs = toIdentityCorrectionStubs([
      {
        id: 'id1',
        schemaVersion: 1,
        target: { provider: 'tmdb', id: '550', entityKind: 'movie' },
        type: 'missing_external_id',
        payload: { provider: 'imdb', id: 'tt0137523' },
        reason: 'add imdb',
        sources: [{ kind: 'manual', label: 'note' }],
        status: 'local',
        scope: 'local',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ]);
    const mapping = resolveIdentityMapping({
      ids: { tmdb: 550, imdb: 'tt0137523' },
      corrections: stubs,
    });
    expect(mapping.selectedByProvider.imdb?.method).toBe('manual');
    expect(mapping.selectedByProvider.imdb?.verified).toBe(true);
  });

  it('filters corrections by cross-provider identity and remaps video lists', () => {
    const corrections = [
      {
        id: 'ep-imdb',
        schemaVersion: 1 as const,
        target: { provider: 'imdb' as const, id: 'tt0903747', entityKind: 'series' as const },
        type: 'episode_reassignment' as const,
        payload: {
          from: { season: 1, episode: 1 },
          to: { season: 0, episode: 1 },
        },
        reason: 'pilot special',
        sources: [{ kind: 'test-fixture' as const, label: 'fixture' }],
        status: 'verified' as const,
        scope: 'community' as const,
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
      {
        id: 'ep-other',
        schemaVersion: 1 as const,
        target: { provider: 'imdb' as const, id: 'tt9999999', entityKind: 'series' as const },
        type: 'episode_reassignment' as const,
        payload: {
          from: { season: 1, episode: 1 },
          to: { season: 2, episode: 1 },
        },
        reason: 'other show',
        sources: [{ kind: 'test-fixture' as const, label: 'fixture' }],
        status: 'verified' as const,
        scope: 'community' as const,
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ];

    const matched = filterCorrectionsForIdentity(corrections, {
      imdb: 'tt0903747',
      tmdb: 1396,
    });
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe('ep-imdb');
    expect(correctionsReferenceSpecialSeason(matched)).toBe(true);

    const remapped = applyEpisodeCorrectionsToVideos(
      [
        {
          id: 'tt0903747:1:1',
          title: 'Pilot',
          name: 'Pilot',
          season: 1,
          episode: 1,
        },
      ],
      matched,
      { imdbId: 'tt0903747', tmdbId: 1396 },
    );
    expect(remapped[0]).toMatchObject({
      id: 'tt0903747:0:1',
      season: 0,
      episode: 1,
    });
  });

  it('loads community samples and supports moderation + rollback', () => {
    const registry = new CorrectionRegistry();
    const loaded = registry.loadCommunity(loadSampleCommunityCorrections());
    expect(loaded.loaded).toBeGreaterThan(0);
    expect(loaded.rejected).toHaveLength(0);

    const created = registry.upsertLocal('cfg-1', {
      target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' },
      type: 'runtime_correction',
      payload: { runtimeMinutes: 139 },
      reason: 'Fix wrong runtime',
      sources: [{ kind: 'manual', label: 'IMDb page' }],
      author: 'silas',
    });
    expect(created.scope).toBe('local');

    const proposed = applyModeration(registry, 'cfg-1', created.id, { type: 'propose' });
    expect(proposed?.status).toBe('proposed');
    const verified = applyModeration(registry, 'cfg-1', created.id, { type: 'verify' });
    expect(verified?.status).toBe('verified');

    expect(registry.deleteLocal('cfg-1', created.id)).toBe(true);
    expect(registry.get('cfg-1', created.id)).toBeNull();
  });
});

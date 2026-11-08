import { describe, expect, it } from 'vitest';
import {
  isMetaLayerReleaseTag,
  listStableReleases,
  pickMetaLayerRelease,
  releaseBodyText,
  releaseDisplayVersion,
  type GithubReleaseWire,
} from './whats-new';

function release(
  partial: Partial<GithubReleaseWire> & Pick<GithubReleaseWire, 'tag_name'>,
): GithubReleaseWire {
  return {
    id: partial.id ?? 1,
    tag_name: partial.tag_name,
    name: partial.name ?? null,
    body: partial.body ?? null,
    html_url: partial.html_url ?? 'https://example.com',
    published_at: partial.published_at ?? null,
    prerelease: partial.prerelease ?? false,
    draft: partial.draft ?? false,
  };
}

describe('whats-new releases helpers', () => {
  it('returns plain release body without the tag echo', () => {
    const item = release({
      tag_name: '2.31.0',
      body: '2.31.0\n\n- Fix streams\n- Improve UI',
    });
    expect(releaseBodyText(item)).toBe('- Fix streams\n- Improve UI');
    expect(releaseDisplayVersion(item)).toBe('2.31.0');
  });

  it('prefers MetaLayer 1.x tags over legacy 3.x', () => {
    const picked = pickMetaLayerRelease([
      release({ id: 1, tag_name: '3.0.0' }),
      release({ id: 2, tag_name: 'v1.0.0-beta.1', prerelease: true }),
      release({ id: 3, tag_name: '0.0.1' }),
    ]);
    expect(picked?.tag_name).toBe('v1.0.0-beta.1');
    expect(isMetaLayerReleaseTag('3.0.0')).toBe(false);
  });

  it('lists stable releases and skips nightly', () => {
    const listed = listStableReleases(
      [
        release({ id: 1, tag_name: '2.31.0-nightly', body: 'nightly' }),
        release({ id: 2, tag_name: '2.31.0', body: 'stable' }),
        release({ id: 3, tag_name: '2.30.0', body: 'older' }),
      ],
      2,
    );
    expect(listed.map((item) => item.tag_name)).toEqual(['2.31.0', '2.30.0']);
  });
});

/**
 * What’s New sources GitHub Releases.
 *
 * TEMP preview: uses Viren070/AIOStreams release notes to validate the rail UI.
 * Revert owner/repo to mrcanelas/tmdb-addon (and pickMetaLayerRelease) before ship.
 */

export const WHATS_NEW_GITHUB_OWNER = 'Viren070';
export const WHATS_NEW_GITHUB_REPO = 'AIOStreams';

export const WHATS_NEW_RELEASES_HREF = `https://github.com/${WHATS_NEW_GITHUB_OWNER}/${WHATS_NEW_GITHUB_REPO}/releases`;

export interface GithubReleaseWire {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

export function releaseDisplayVersion(release: GithubReleaseWire): string {
  const tag = release.tag_name.replace(/^v/i, '');
  const name = release.name?.trim();
  return tag || name || release.tag_name;
}

/** Plain release notes for the rail (no HTML / markdown rendering). */
export function releaseBodyText(release: GithubReleaseWire): string {
  const raw = release.body?.trim() ?? '';
  if (!raw) return '';
  return raw.replaceAll(release.tag_name, '').trim();
}

export function formatReleaseDate(
  publishedAt: string | null,
  locale: string,
): string | null {
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** MetaLayer line starts at 1.0.0 — ignore legacy TMDB Addon 3.x tags on Home. */
export function isMetaLayerReleaseTag(tagName: string): boolean {
  const normalized = tagName.replace(/^v/i, '');
  return (
    /^1\./.test(normalized) ||
    /metalayer/i.test(tagName) ||
    /1\.0\.0-(alpha|beta|rc)/i.test(normalized)
  );
}

export function pickMetaLayerRelease(
  releases: GithubReleaseWire[],
): GithubReleaseWire | null {
  return releases.find((release) => isMetaLayerReleaseTag(release.tag_name)) ?? null;
}

/**
 * TEMP preview picker: prefer a stable release that has notes.
 * Swap What’s New panel back to pickMetaLayerRelease when leaving preview mode.
 */
export function pickPreviewRelease(
  releases: GithubReleaseWire[],
): GithubReleaseWire | null {
  const withNotes = releases.find(
    (release) =>
      Boolean(release.body?.trim()) && !release.tag_name.endsWith('-nightly'),
  );
  if (withNotes) return withNotes;
  return (
    releases.find((release) => Boolean(release.body?.trim())) ??
    releases[0] ??
    null
  );
}

/** Stable non-nightly releases for a simple chronological What’s New list. */
export function listStableReleases(
  releases: GithubReleaseWire[],
  limit = 3,
): GithubReleaseWire[] {
  return releases
    .filter((release) => !release.tag_name.endsWith('-nightly'))
    .slice(0, limit);
}

export async function fetchGithubReleases(
  perPage = 5,
): Promise<GithubReleaseWire[]> {
  const url = `https://api.github.com/repos/${WHATS_NEW_GITHUB_OWNER}/${WHATS_NEW_GITHUB_REPO}/releases?per_page=${perPage}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GITHUB_RELEASES_${response.status}`);
  }
  const body = (await response.json()) as GithubReleaseWire[];
  return body.filter((release) => !release.draft);
}

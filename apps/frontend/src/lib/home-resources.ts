/** External / docs links for the Home Resources grid. */

export type HomeResourceKind = 'external' | 'donate';

export const HOME_RESOURCES: Array<{
  id: string;
  labelKey: string;
  kind: HomeResourceKind;
  href?: string;
  emphasize?: boolean;
}> = [
  {
    id: 'docs',
    labelKey: 'overview.resources.docs',
    kind: 'external',
    href: 'https://github.com/mrcanelas/tmdb-addon/blob/feat/metalayer-phase-a-baseline/README.md',
  },
  {
    id: 'migration',
    labelKey: 'overview.resources.migration',
    kind: 'external',
    href: 'https://github.com/mrcanelas/tmdb-addon/blob/feat/metalayer-phase-a-baseline/docs/migration-from-tmdb-addon.md',
  },
  {
    id: 'self-hosting',
    labelKey: 'overview.resources.selfHosting',
    kind: 'external',
    href: 'https://github.com/mrcanelas/tmdb-addon/blob/feat/metalayer-phase-a-baseline/docs/self-hosting.md',
  },
  {
    id: 'github',
    labelKey: 'overview.resources.github',
    kind: 'external',
    href: 'https://github.com/mrcanelas/tmdb-addon',
  },
  {
    id: 'discord',
    labelKey: 'overview.resources.discord',
    kind: 'external',
    // Community stand-in until a Discord invite exists.
    href: 'https://github.com/mrcanelas/tmdb-addon/discussions',
  },
  {
    id: 'donate',
    labelKey: 'overview.resources.donate',
    kind: 'donate',
    emphasize: true,
  },
];

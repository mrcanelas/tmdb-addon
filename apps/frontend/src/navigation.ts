import type { LucideIcon } from 'lucide-react';
import {
  Blocks,
  Heart,
  House,
  Layers,
  LayoutDashboard,
  LibraryBig,
  Save,
  ScanSearch,
  UsersRound,
} from 'lucide-react';

/**
 * Primary configure destinations (`docs/configure-navigation-contract.md`).
 * Former modules live as tabs / deep links under these hubs.
 */
export type ConfigureModuleId =
  | 'home'
  | 'sources'
  | 'catalogs'
  | 'metas'
  | 'profiles'
  | 'review'
  | 'save-install'
  | 'dashboard'
  | 'donate';

export type ConfigureNavKind = 'route' | 'external' | 'action';

export interface ConfigureNavItem {
  id: ConfigureModuleId;
  labelKey: string;
  /**
   * When false, item is Advanced-only.
   * Utility items (`dashboard`, `donate`) stay visible in Simple for now —
   * Dashboard can flip to `false` later if Simple should hide operator entry.
   */
  simpleMode: boolean;
  /** Separates primary modules from bottom utilities in the rail */
  pinnedBottom?: boolean;
  Icon: LucideIcon;
  kind: ConfigureNavKind;
  /** Internal React Router path (kind: route) */
  path?: string;
  /** Absolute or host path outside configure (kind: external) */
  href?: string;
  /** App action id (kind: action) */
  action?: 'donate';
}

export const CONFIGURE_NAV: ConfigureNavItem[] = [
  {
    id: 'home',
    path: '/',
    labelKey: 'nav.home',
    simpleMode: true,
    kind: 'route',
    Icon: House,
  },
  {
    id: 'sources',
    path: '/sources',
    labelKey: 'nav.sources',
    simpleMode: true,
    kind: 'route',
    Icon: Blocks,
  },
  {
    id: 'catalogs',
    path: '/catalogs',
    labelKey: 'nav.catalogs',
    simpleMode: true,
    kind: 'route',
    Icon: LibraryBig,
  },
  {
    id: 'metas',
    path: '/metas',
    labelKey: 'nav.metas',
    simpleMode: true,
    kind: 'route',
    Icon: Layers,
  },
  {
    id: 'profiles',
    path: '/profiles',
    labelKey: 'nav.profiles',
    simpleMode: false,
    kind: 'route',
    Icon: UsersRound,
  },
  {
    id: 'review',
    path: '/review',
    labelKey: 'nav.review',
    simpleMode: false,
    kind: 'route',
    Icon: ScanSearch,
  },
  {
    id: 'save-install',
    path: '/save-install',
    labelKey: 'nav.saveInstall',
    simpleMode: true,
    kind: 'route',
    Icon: Save,
  },
  {
    id: 'dashboard',
    href: '/admin/',
    labelKey: 'nav.dashboard',
    simpleMode: true,
    pinnedBottom: true,
    kind: 'external',
    Icon: LayoutDashboard,
  },
  {
    id: 'donate',
    labelKey: 'nav.donate',
    simpleMode: true,
    pinnedBottom: true,
    kind: 'action',
    action: 'donate',
    Icon: Heart,
  },
];

/** Public donation destinations (independent implementation — not AIOStreams code). */
export const DONATE_OPTIONS = [
  {
    id: 'github-sponsors',
    labelKey: 'donate.githubSponsors',
    href: 'https://github.com/sponsors/mrcanelas',
    Icon: Heart,
  },
  {
    id: 'kofi',
    labelKey: 'donate.kofi',
    href: 'https://ko-fi.com/mrcanelas',
    Icon: Heart,
  },
] as const;

/** Default entry path when jumping to a hub via Prev / Next. */
export const CONFIGURE_HUB_ENTRY: Partial<Record<ConfigureModuleId, string>> = {
  home: '/',
  sources: '/sources',
  catalogs: '/catalogs/studio',
  metas: '/metas/fields',
  profiles: '/profiles',
  review: '/review/inspector',
  'save-install': '/save-install',
};

export interface ConfigureSearchDestination {
  id: string;
  path: string;
  /** Breadcrumb label keys, e.g. Metas → Language */
  labelKeys: string[];
  simpleMode: boolean;
}

/** Flat destinations for the header search modal. */
export const CONFIGURE_SEARCH_DESTINATIONS: ConfigureSearchDestination[] = [
  { id: 'home', path: '/', labelKeys: ['nav.home'], simpleMode: true },
  {
    id: 'sources-providers',
    path: '/sources',
    labelKeys: ['nav.sources'],
    simpleMode: true,
  },
  {
    id: 'sources-tracking',
    path: '/sources/tracking',
    labelKeys: ['nav.sources', 'nav.tracking'],
    simpleMode: true,
  },
  {
    id: 'sources-search',
    path: '/sources/search',
    labelKeys: ['nav.sources', 'nav.searchAi'],
    simpleMode: true,
  },
  {
    id: 'catalogs-studio',
    path: '/catalogs/studio',
    labelKeys: ['nav.catalogs', 'hub.catalogs.tab.studio'],
    simpleMode: true,
  },
  {
    id: 'catalogs-rules',
    path: '/catalogs/rules',
    labelKeys: ['nav.catalogs', 'hub.catalogs.tab.rules'],
    simpleMode: true,
  },
  {
    id: 'catalogs-order',
    path: '/catalogs/order',
    labelKeys: ['nav.catalogs', 'hub.catalogs.tab.order'],
    simpleMode: true,
  },
  {
    id: 'metas-fields',
    path: '/metas/fields',
    labelKeys: ['nav.metas', 'hub.metas.tab.fields'],
    simpleMode: true,
  },
  {
    id: 'metas-language',
    path: '/metas/language',
    labelKeys: ['nav.metas', 'hub.metas.tab.language'],
    simpleMode: true,
  },
  {
    id: 'metas-appearance',
    path: '/metas/appearance',
    labelKeys: ['nav.metas', 'hub.metas.tab.appearance'],
    simpleMode: true,
  },
  {
    id: 'profiles',
    path: '/profiles',
    labelKeys: ['nav.profiles'],
    simpleMode: false,
  },
  {
    id: 'review-inspector',
    path: '/review/inspector',
    labelKeys: ['nav.review', 'hub.review.tab.inspector'],
    simpleMode: false,
  },
  {
    id: 'review-corrections',
    path: '/review/corrections',
    labelKeys: ['nav.review', 'hub.review.tab.corrections'],
    simpleMode: false,
  },
  {
    id: 'review-diagnostics',
    path: '/review/diagnostics',
    labelKeys: ['nav.review', 'hub.review.tab.diagnostics'],
    simpleMode: false,
  },
  {
    id: 'save-install',
    path: '/save-install',
    labelKeys: ['nav.saveInstall'],
    simpleMode: true,
  },
];

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function matchConfigureHub(pathname: string): ConfigureModuleId {
  const path = normalizePath(pathname);
  if (path === '/') return 'home';

  const ranked = CONFIGURE_NAV.filter(
    (item) => item.kind === 'route' && item.path && item.path !== '/',
  ).sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0));

  for (const item of ranked) {
    const itemPath = item.path!;
    if (path === itemPath || path.startsWith(`${itemPath}/`)) {
      return item.id;
    }
  }

  return 'home';
}

export function getVisibleConfigureNav(
  mode: 'simple' | 'advanced',
): ConfigureNavItem[] {
  return CONFIGURE_NAV.filter(
    (item) => mode === 'advanced' || item.simpleMode,
  );
}

/** Route hubs only — used by header Prev / Next. */
export function getConfigureRouteNav(
  mode: 'simple' | 'advanced',
): ConfigureNavItem[] {
  return getVisibleConfigureNav(mode).filter((item) => item.kind === 'route');
}

/** Adjacent hub entry path for header Prev / Next (-1 | 1). */
export function getAdjacentHubPath(
  pathname: string,
  mode: 'simple' | 'advanced',
  direction: -1 | 1,
): string | null {
  const visible = getConfigureRouteNav(mode);
  const currentId = matchConfigureHub(pathname);
  const index = visible.findIndex((item) => item.id === currentId);
  if (index < 0) return null;
  const next = visible[index + direction];
  if (!next?.path) return null;
  return CONFIGURE_HUB_ENTRY[next.id] ?? next.path;
}

/** Legacy paths kept as redirects for bookmarks and existing links. */
export const CONFIGURE_LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/overview', to: '/' },
  { from: '/home', to: '/' },
  { from: '/catalog-studio', to: '/catalogs/studio' },
  { from: '/rules', to: '/catalogs/rules' },
  { from: '/sorting', to: '/catalogs/order' },
  { from: '/meta-builder', to: '/metas/fields' },
  { from: '/resolution', to: '/metas/fields' },
  { from: '/language-region', to: '/metas/language' },
  { from: '/appearance', to: '/metas/appearance' },
  { from: '/inspector', to: '/review/inspector' },
  { from: '/corrections', to: '/review/corrections' },
  { from: '/advanced', to: '/review/diagnostics' },
  { from: '/diagnostics', to: '/review/diagnostics' },
  { from: '/tracking', to: '/sources/tracking' },
  { from: '/search-ai', to: '/sources/search' },
];

import type { IconType } from 'react-icons';
import {
  HiOutlineArrowDownTray,
  HiOutlineBuildingLibrary,
  HiOutlineCubeTransparent,
  HiOutlineHome,
  HiOutlineRectangleStack,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUsers,
} from 'react-icons/hi2';

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
  | 'save-install';

export interface ConfigureNavItem {
  id: ConfigureModuleId;
  path: string;
  labelKey: string;
  simpleMode: boolean;
  /** Separates primary modules from Save & Install in the rail */
  pinnedBottom?: boolean;
  Icon: IconType;
}

export const CONFIGURE_NAV: ConfigureNavItem[] = [
  {
    id: 'home',
    path: '/',
    labelKey: 'nav.home',
    simpleMode: true,
    Icon: HiOutlineHome,
  },
  {
    id: 'sources',
    path: '/sources',
    labelKey: 'nav.sources',
    simpleMode: true,
    Icon: HiOutlineBuildingLibrary,
  },
  {
    id: 'catalogs',
    path: '/catalogs',
    labelKey: 'nav.catalogs',
    simpleMode: true,
    Icon: HiOutlineRectangleStack,
  },
  {
    id: 'metas',
    path: '/metas',
    labelKey: 'nav.metas',
    simpleMode: true,
    Icon: HiOutlineCubeTransparent,
  },
  {
    id: 'profiles',
    path: '/profiles',
    labelKey: 'nav.profiles',
    simpleMode: false,
    Icon: HiOutlineUsers,
  },
  {
    id: 'review',
    path: '/review',
    labelKey: 'nav.review',
    simpleMode: false,
    Icon: HiOutlineClipboardDocumentCheck,
  },
  {
    id: 'save-install',
    path: '/save-install',
    labelKey: 'nav.saveInstall',
    simpleMode: true,
    pinnedBottom: true,
    Icon: HiOutlineArrowDownTray,
  },
];

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

import type { IconType } from 'react-icons';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowsUpDown,
  HiOutlineBuildingLibrary,
  HiOutlineCheckBadge,
  HiOutlineCog6Tooth,
  HiOutlineCubeTransparent,
  HiOutlineEye,
  HiOutlineFunnel,
  HiOutlineHome,
  HiOutlineLanguage,
  HiOutlinePhoto,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';

export type ConfigureModuleId =
  | 'overview'
  | 'sources'
  | 'language-region'
  | 'catalog-studio'
  | 'rules'
  | 'sorting'
  | 'inspector'
  | 'appearance'
  | 'meta-builder'
  | 'search-ai'
  | 'tracking'
  | 'corrections'
  | 'profiles'
  | 'advanced'
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

/** Navigation mirrors AGENTS.md §7 / §31 — UI labels may be friendlier than internal module names. */
export const CONFIGURE_NAV: ConfigureNavItem[] = [
  {
    id: 'overview',
    path: '/',
    labelKey: 'nav.overview',
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
    id: 'language-region',
    path: '/language-region',
    labelKey: 'nav.languageRegion',
    simpleMode: true,
    Icon: HiOutlineLanguage,
  },
  {
    id: 'catalog-studio',
    path: '/catalog-studio',
    labelKey: 'nav.catalogStudio',
    simpleMode: true,
    Icon: HiOutlineRectangleStack,
  },
  {
    id: 'rules',
    path: '/rules',
    labelKey: 'nav.rules',
    simpleMode: true,
    Icon: HiOutlineFunnel,
  },
  {
    id: 'sorting',
    path: '/sorting',
    labelKey: 'nav.sorting',
    simpleMode: false,
    Icon: HiOutlineArrowsUpDown,
  },
  {
    id: 'inspector',
    path: '/inspector',
    labelKey: 'nav.inspector',
    simpleMode: false,
    Icon: HiOutlineEye,
  },
  {
    id: 'appearance',
    path: '/appearance',
    labelKey: 'nav.appearance',
    simpleMode: true,
    Icon: HiOutlinePhoto,
  },
  {
    id: 'meta-builder',
    path: '/meta-builder',
    labelKey: 'nav.metaBuilder',
    simpleMode: false,
    Icon: HiOutlineCubeTransparent,
  },
  {
    id: 'search-ai',
    path: '/search-ai',
    labelKey: 'nav.searchAi',
    simpleMode: false,
    Icon: HiOutlineSparkles,
  },
  {
    id: 'tracking',
    path: '/tracking',
    labelKey: 'nav.tracking',
    simpleMode: false,
    Icon: HiOutlineCheckBadge,
  },
  {
    id: 'corrections',
    path: '/corrections',
    labelKey: 'nav.corrections',
    simpleMode: false,
    Icon: HiOutlineWrenchScrewdriver,
  },
  {
    id: 'profiles',
    path: '/profiles',
    labelKey: 'nav.profiles',
    simpleMode: false,
    Icon: HiOutlineUsers,
  },
  {
    id: 'advanced',
    path: '/advanced',
    labelKey: 'nav.advanced',
    simpleMode: false,
    Icon: HiOutlineCog6Tooth,
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

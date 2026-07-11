export type ConfigureModuleId =
  | 'overview'
  | 'sources'
  | 'language-region'
  | 'catalog-studio'
  | 'rules'
  | 'sorting'
  | 'appearance'
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
}

/** Navigation mirrors AGENTS.md §7 / §31 — placeholders until modules ship. */
export const CONFIGURE_NAV: ConfigureNavItem[] = [
  { id: 'overview', path: '/', labelKey: 'nav.overview', simpleMode: true },
  { id: 'sources', path: '/sources', labelKey: 'nav.sources', simpleMode: true },
  {
    id: 'language-region',
    path: '/language-region',
    labelKey: 'nav.languageRegion',
    simpleMode: true,
  },
  {
    id: 'catalog-studio',
    path: '/catalog-studio',
    labelKey: 'nav.catalogStudio',
    simpleMode: true,
  },
  { id: 'rules', path: '/rules', labelKey: 'nav.rules', simpleMode: true },
  { id: 'sorting', path: '/sorting', labelKey: 'nav.sorting', simpleMode: false },
  { id: 'appearance', path: '/appearance', labelKey: 'nav.appearance', simpleMode: true },
  { id: 'search-ai', path: '/search-ai', labelKey: 'nav.searchAi', simpleMode: false },
  { id: 'tracking', path: '/tracking', labelKey: 'nav.tracking', simpleMode: false },
  { id: 'corrections', path: '/corrections', labelKey: 'nav.corrections', simpleMode: false },
  { id: 'profiles', path: '/profiles', labelKey: 'nav.profiles', simpleMode: false },
  { id: 'advanced', path: '/advanced', labelKey: 'nav.advanced', simpleMode: false },
  {
    id: 'save-install',
    path: '/save-install',
    labelKey: 'nav.saveInstall',
    simpleMode: true,
  },
];

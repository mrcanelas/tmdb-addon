/** Field rail registry for Metas → Fields (AGENTS.md §10.17). */

export type FieldGroupId =
  | 'general'
  | 'localizedText'
  | 'artwork'
  | 'facts'
  | 'credits'
  | 'ratings'
  | 'episodeStructure';

export type FieldRailId =
  | 'general'
  | 'title'
  | 'originalTitle'
  | 'description'
  | 'tagline'
  | 'poster'
  | 'background'
  | 'logo'
  | 'genres'
  | 'runtime'
  | 'releaseDate'
  | 'certification'
  | 'cast'
  | 'directors'
  | 'writers'
  | 'rating'
  | 'voteCount'
  | 'episodes'
  | 'episodeOrder'
  | 'externalIds';

export type FieldCategory =
  | 'settings'
  | 'localized'
  | 'artwork'
  | 'factual'
  | 'credits'
  | 'ratings'
  | 'episode';

export type FieldRailKind = 'settings' | 'resolution';

export interface FieldRailEntry {
  id: FieldRailId;
  group: FieldGroupId;
  category: FieldCategory;
  kind: FieldRailKind;
  /** When false, the rail shows the field as coming soon. */
  editable: boolean;
  /** Prefer locales in the builder. */
  allowLocales: boolean;
  providerOptions: string[];
  /** Lucide-ish glyph key for the rail icon. */
  icon:
    | 'text'
    | 'image'
    | 'fact'
    | 'people'
    | 'star'
    | 'list'
    | 'general'
    | 'language'
    | 'appearance';
}

export const FIELD_GROUPS: FieldGroupId[] = [
  'general',
  'localizedText',
  'artwork',
  'facts',
  'credits',
  'ratings',
  'episodeStructure',
];

export const FIELD_REGISTRY: FieldRailEntry[] = [
  {
    id: 'general',
    group: 'general',
    category: 'settings',
    kind: 'settings',
    editable: true,
    allowLocales: false,
    providerOptions: [],
    icon: 'general',
  },
  {
    id: 'title',
    group: 'localizedText',
    category: 'localized',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'text',
  },
  {
    id: 'originalTitle',
    group: 'localizedText',
    category: 'localized',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'text',
  },
  {
    id: 'description',
    group: 'localizedText',
    category: 'localized',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'text',
  },
  {
    id: 'tagline',
    group: 'localizedText',
    category: 'localized',
    kind: 'resolution',
    editable: false,
    allowLocales: true,
    providerOptions: ['tmdb', 'tvdb'],
    icon: 'text',
  },
  {
    id: 'poster',
    group: 'artwork',
    category: 'artwork',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: [
      'rpdb',
      'topposters',
      'aioratings',
      'openposterdb',
      'fanart',
      'tmdb',
      'tvdb',
      'imdb',
    ],
    icon: 'image',
  },
  {
    id: 'background',
    group: 'artwork',
    category: 'artwork',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: [
      'fanart',
      'tmdb',
      'rpdb',
      'aioratings',
      'openposterdb',
      'imdb',
    ],
    icon: 'image',
  },
  {
    id: 'logo',
    group: 'artwork',
    category: 'artwork',
    kind: 'resolution',
    editable: true,
    allowLocales: true,
    providerOptions: [
      'rpdb',
      'topposters',
      'aioratings',
      'openposterdb',
      'fanart',
      'tmdb',
      'tvdb',
      'imdb',
    ],
    icon: 'image',
  },
  {
    id: 'genres',
    group: 'facts',
    category: 'factual',
    kind: 'resolution',
    editable: false,
    allowLocales: true,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'fact',
  },
  {
    id: 'runtime',
    group: 'facts',
    category: 'factual',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'fact',
  },
  {
    id: 'releaseDate',
    group: 'facts',
    category: 'factual',
    kind: 'resolution',
    editable: true,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'fact',
  },
  {
    id: 'certification',
    group: 'facts',
    category: 'factual',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb'],
    icon: 'fact',
  },
  {
    id: 'cast',
    group: 'credits',
    category: 'credits',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'people',
  },
  {
    id: 'directors',
    group: 'credits',
    category: 'credits',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'people',
  },
  {
    id: 'writers',
    group: 'credits',
    category: 'credits',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'people',
  },
  {
    id: 'rating',
    group: 'ratings',
    category: 'ratings',
    kind: 'resolution',
    editable: true,
    allowLocales: false,
    providerOptions: ['imdb', 'tmdb', 'trakt', 'mdblist'],
    icon: 'star',
  },
  {
    id: 'voteCount',
    group: 'ratings',
    category: 'ratings',
    kind: 'resolution',
    editable: true,
    allowLocales: false,
    providerOptions: ['tmdb', 'imdb'],
    icon: 'star',
  },
  {
    id: 'episodes',
    group: 'episodeStructure',
    category: 'episode',
    kind: 'resolution',
    editable: false,
    allowLocales: true,
    providerOptions: ['tvdb', 'tmdb', 'imdb'],
    icon: 'list',
  },
  {
    id: 'episodeOrder',
    group: 'episodeStructure',
    category: 'episode',
    kind: 'resolution',
    editable: false,
    allowLocales: false,
    providerOptions: ['tvdb', 'tmdb', 'kitsu', 'anilist'],
    icon: 'list',
  },
  {
    id: 'externalIds',
    group: 'facts',
    category: 'factual',
    kind: 'resolution',
    editable: true,
    allowLocales: false,
    providerOptions: ['tmdb', 'tvdb', 'imdb'],
    icon: 'fact',
  },
];

const BY_ID = new Map(FIELD_REGISTRY.map((entry) => [entry.id, entry]));

export function getFieldEntry(id: string): FieldRailEntry | undefined {
  return BY_ID.get(id as FieldRailId);
}

export function listEditableFields(): FieldRailEntry[] {
  return FIELD_REGISTRY.filter((entry) => entry.editable);
}

export function listResolutionFields(): FieldRailEntry[] {
  return FIELD_REGISTRY.filter(
    (entry) => entry.editable && entry.kind === 'resolution',
  );
}

export function isEditableFieldId(id: string): boolean {
  return getFieldEntry(id)?.editable === true;
}

export function isSettingsFieldId(id: string): boolean {
  return getFieldEntry(id)?.kind === 'settings';
}

export function isResolutionFieldId(id: string): boolean {
  const entry = getFieldEntry(id);
  return entry?.kind === 'resolution' && entry.editable === true;
}

export function defaultSelectedFieldId(): FieldRailId {
  return 'general';
}

export function parseFieldQueryParam(value: string | null): FieldRailId {
  if (!value) return defaultSelectedFieldId();
  // Former Language / Appearance settings panels now live under General.
  if (value === 'language' || value === 'appearance') return 'general';
  return BY_ID.has(value as FieldRailId)
    ? (value as FieldRailId)
    : defaultSelectedFieldId();
}

export function filterFieldRegistry(query: string): FieldRailEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return FIELD_REGISTRY;
  return FIELD_REGISTRY.filter((entry) =>
    entry.id.toLowerCase().includes(normalized),
  );
}

export function groupFieldEntries(
  entries: FieldRailEntry[],
): Array<{ group: FieldGroupId; fields: FieldRailEntry[] }> {
  return FIELD_GROUPS.map((group) => ({
    group,
    fields: entries.filter((entry) => entry.group === group),
  })).filter((block) => block.fields.length > 0);
}

export function adjacentEditableField(
  current: FieldRailId,
  direction: -1 | 1,
): FieldRailId | null {
  const editable = listEditableFields();
  const index = editable.findIndex((entry) => entry.id === current);
  if (index < 0) return editable[0]?.id ?? null;
  const next = editable[index + direction];
  return next?.id ?? null;
}

import type {
  ConnectionState,
  ProviderCapabilities,
  ProviderCategory,
  ProviderDefinition,
} from '@metalayer/providers';

export interface PublicSource {
  id: string;
  name: string;
  categories: ProviderCategory[];
  connectionState: ConnectionState;
  requiresCredential: boolean;
  requiresOAuth: boolean;
  capabilities: ProviderCapabilities;
  adapterAvailable: boolean;
}

export interface SourceTestResult {
  providerId: string;
  ok: boolean;
  health?: { state?: string };
  error?: { code?: string; providerCode?: string; message?: string };
  cacheKeyExample?: string;
  correlationId?: string;
}

function apiBase(): string {
  const fromEnv =
    typeof process !== 'undefined'
      ? process.env.PUBLIC_METALAYER_API_BASE
      : undefined;
  return (fromEnv || '').replace(/\/$/, '');
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & { code?: string; message?: string };
  if (!response.ok) {
    const error = new Error(body.message || `Request failed (${response.status})`);
    (error as Error & { status?: number; body?: unknown }).status = response.status;
    (error as Error & { status?: number; body?: unknown }).body = body;
    throw error;
  }
  return body;
}

export async function fetchSources(): Promise<PublicSource[]> {
  const body = await apiFetch<{ sources: PublicSource[] }>('/api/v1/sources');
  return body.sources;
}

export async function testSource(
  providerId: string,
  options: { apiKey?: string; locale?: string; region?: string } = {},
): Promise<SourceTestResult> {
  const response = await fetch(`${apiBase()}/api/v1/sources/${providerId}/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  const body = (await response.json()) as SourceTestResult;
  return body;
}

export function toPublicSource(
  provider: ProviderDefinition,
  adapterAvailable: boolean,
): PublicSource {
  return {
    id: provider.id,
    name: provider.name,
    categories: provider.categories,
    connectionState: provider.connectionState,
    requiresCredential: provider.requiresCredential,
    requiresOAuth: provider.requiresOAuth,
    capabilities: provider.capabilities,
    adapterAvailable,
  };
}

const SESSION_KEY = 'metalayer.catalogStudio.session';

export interface CatalogListItem {
  instanceId: string;
  provider: string;
  providerCatalogId: string;
  mediaType: 'movie' | 'series' | 'anime';
  originalName: string;
  customName?: string;
  name?: { default: string; values?: Record<string, string> };
  enabled: boolean;
  showInHome: boolean;
  position: number;
  tags: string[];
  group?: string;
  merge?: {
    mode: string;
    sources: Array<{ instanceId: string; weight?: number }>;
  };
  rotation?: {
    mode: string;
    sources: string[];
  };
}

export interface ManifestCatalogEntry {
  instanceId: string;
  id: string;
  type: 'movie' | 'series' | 'anime';
  name: string;
  showInHome: boolean;
}

export interface CatalogMetaPreview {
  id: string;
  type: 'movie' | 'series' | 'anime';
  name: string;
  poster?: string;
  releaseInfo?: string;
  provider?: string;
  sourceInstanceId?: string;
}

export type StudioCatalogAction =
  | 'rename'
  | 'duplicate'
  | 'move'
  | 'enable'
  | 'disable'
  | 'showInHome'
  | 'hideInHome'
  | 'delete'
  | 'setTags'
  | 'setGroup';

export interface CatalogSession {
  configId: string;
  editCredential: string;
}

export function readCatalogSession(): CatalogSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogSession;
    if (!parsed.configId || !parsed.editCredential) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogSession(session: CatalogSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCatalogSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function sampleCatalogs() {
  const id = () => `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return [
    {
      instanceId: id(),
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie' as const,
      originalName: 'Trending Movies',
      enabled: true,
      showInHome: true,
      position: 0,
      tags: [],
    },
    {
      instanceId: id(),
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'series' as const,
      originalName: 'Popular Series',
      enabled: true,
      showInHome: true,
      position: 1,
      tags: [],
    },
    {
      instanceId: id(),
      provider: 'tmdb',
      providerCatalogId: 'top_rated',
      mediaType: 'anime' as const,
      originalName: 'Top Anime',
      enabled: true,
      showInHome: false,
      position: 2,
      tags: [],
    },
  ];
}

export async function bootstrapCatalogDraft(): Promise<{
  configId: string;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  const editCredential = `draft-${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const created = await apiFetch<{
    configId: string;
    config: { catalogs: CatalogListItem[] };
  }>('/api/v1/configurations', {
    method: 'POST',
    body: JSON.stringify({
      editCredential,
      name: 'Catalog Studio draft',
      config: {
        configVersion: 1,
        name: 'Catalog Studio draft',
        localization: {
          interfaceLocale: 'en-US',
          metadataLocale: 'en-US',
          metadataFallbackLocales: [],
          titleMode: 'localized',
          descriptionMode: 'localized',
          contentRegion: 'US',
          timezone: 'UTC',
        },
        identity: { stremioPublicId: 'imdb' },
        catalogs: sampleCatalogs(),
        featureFlags: {},
        createdAt: now,
        updatedAt: now,
      },
    }),
  });

  writeCatalogSession({ configId: created.configId, editCredential });
  return fetchCatalogs(created.configId, editCredential);
}

export async function fetchCatalogs(
  configId: string,
  editCredential: string,
  locale?: string,
): Promise<{
  configId: string;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
  return apiFetch(`/api/v1/configurations/${configId}/catalogs${query}`, {
    headers: {
      'x-metalayer-edit-credential': editCredential,
    },
  });
}

export async function mutateCatalog(
  configId: string,
  editCredential: string,
  instanceId: string,
  body: {
    action: StudioCatalogAction;
    customName?: string;
    toIndex?: number;
    tags?: string[];
    group?: string | null;
  },
): Promise<{
  configId: string;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  return apiFetch(`/api/v1/configurations/${configId}/catalogs/${instanceId}`, {
    method: 'POST',
    headers: {
      'x-metalayer-edit-credential': editCredential,
    },
    body: JSON.stringify(body),
  });
}

export async function createStudioCatalog(
  configId: string,
  editCredential: string,
  body: {
    action: 'createMerged' | 'createRotated';
    name: string;
    mediaType: 'movie' | 'series' | 'anime';
    mergeMode?: string;
    rotationMode?: string;
    sourceInstanceIds: string[];
  },
): Promise<{
  configId: string;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  return apiFetch(`/api/v1/configurations/${configId}/catalogs`, {
    method: 'POST',
    headers: {
      'x-metalayer-edit-credential': editCredential,
    },
    body: JSON.stringify(body),
  });
}

export async function exportStudioCatalogs(
  configId: string,
  editCredential: string,
): Promise<{ catalogs: CatalogListItem[] }> {
  return apiFetch(`/api/v1/configurations/${configId}/catalogs/export`, {
    headers: {
      'x-metalayer-edit-credential': editCredential,
    },
  });
}

export async function importStudioCatalogs(
  configId: string,
  editCredential: string,
  catalogs: unknown,
  mode: 'replace' | 'append' = 'append',
): Promise<{
  configId: string;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  return apiFetch(`/api/v1/configurations/${configId}/catalogs`, {
    method: 'POST',
    headers: {
      'x-metalayer-edit-credential': editCredential,
    },
    body: JSON.stringify({ catalogs, mode }),
  });
}

export async function previewCatalogResults(
  configId: string,
  editCredential: string,
  instanceId: string,
  options: { locale?: string; apiKey?: string } = {},
): Promise<{
  metas: CatalogMetaPreview[];
  warnings: string[];
  mode?: string;
  activeSourceId?: string;
  timingMs?: number;
}> {
  const query = options.locale ? `?locale=${encodeURIComponent(options.locale)}` : '';
  return apiFetch(
    `/api/v1/configurations/${configId}/catalogs/${instanceId}/preview${query}`,
    {
      method: 'POST',
      headers: {
        'x-metalayer-edit-credential': editCredential,
      },
      body: JSON.stringify({ apiKey: options.apiKey }),
    },
  );
}

export interface RuleSetDraft {
  excludeAdult?: boolean;
  digitallyReleasedOnly?: boolean;
  releasedOnly?: boolean;
  minimumRating?: number;
  minimumVotes?: number;
}

export async function ensureStudioSession(): Promise<CatalogSession> {
  const existing = readCatalogSession();
  if (existing) return existing;
  const draft = await bootstrapCatalogDraft();
  const session = readCatalogSession();
  if (!session) {
    throw new Error(`Draft created (${draft.configId}) but session missing`);
  }
  return session;
}

export async function fetchEffectiveRules(
  configId: string,
  editCredential: string,
  provider = 'tmdb',
): Promise<{
  effective: RuleSetDraft;
  warnings: Array<{ rule: string; reason: string; fallback?: string }>;
}> {
  return apiFetch(
    `/api/v1/configurations/${configId}/rules/effective?provider=${encodeURIComponent(provider)}`,
    {
      headers: { 'x-metalayer-edit-credential': editCredential },
    },
  );
}

export async function saveGlobalRules(
  configId: string,
  editCredential: string,
  globalRules: RuleSetDraft,
): Promise<{ globalRules: RuleSetDraft }> {
  return apiFetch(`/api/v1/configurations/${configId}/rules`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ globalRules }),
  });
}

export async function previewRules(
  configId: string,
  editCredential: string,
  items: Array<Record<string, unknown>>,
  rules?: RuleSetDraft,
): Promise<{ included: string[]; excluded: string[]; warnings: Array<{ rule: string; reason: string }> }> {
  return apiFetch(`/api/v1/configurations/${configId}/rules/preview`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ items, rules, provider: 'tmdb' }),
  });
}

export interface SortingPlanDraft {
  criteria: Array<{ field: string; direction: 'asc' | 'desc' }>;
  stable: boolean;
  randomSeedWindow?: 'request' | 'hour' | 'day' | 'week';
}

export async function saveGlobalSorting(
  configId: string,
  editCredential: string,
  globalSorting: SortingPlanDraft,
): Promise<{ globalSorting: SortingPlanDraft | null }> {
  return apiFetch(`/api/v1/configurations/${configId}/sorting`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ globalSorting }),
  });
}

export async function previewSorting(
  configId: string,
  editCredential: string,
  items: Array<Record<string, unknown>>,
  plan: SortingPlanDraft,
): Promise<{ order: string[]; seedWindow: string }> {
  return apiFetch(`/api/v1/configurations/${configId}/sorting/preview`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ items, plan }),
  });
}

export type ProviderCategory =
  | 'metadata'
  | 'artwork'
  | 'ratings'
  | 'catalog'
  | 'tracking'
  | 'identity'
  | 'ai';

export type ConnectionState =
  | 'not_configured'
  | 'connected'
  | 'invalid'
  | 'expired'
  | 'degraded'
  | 'coming_soon';

export interface ProviderCapabilities {
  mediaTypes: Array<'movie' | 'series' | 'anime'>;
  metadataFields: string[];
  catalogFeatures: string[];
  supportsSearch: boolean;
  supportsPagination: boolean;
  supportsRegion: boolean;
  supportsLanguage: boolean;
  supportsAgeRating: boolean;
  supportsDigitalRelease: boolean;
  supportsTracking: boolean;
  supportsOAuth: boolean;
}

/** Wire shape from GET /api/v1/sources — keep free of Node-only provider adapters. */
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

export interface PublicMetaDBListSummary {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

export interface PublicMetaDBPickSummary {
  id: string;
  name: string;
  seed_type?: string;
  description?: string;
  filters?: { media_types?: string[] };
}

export type PublicMetaDBImportSelection =
  | { kind: 'upnext' }
  | { kind: 'list'; listId: string; name: string }
  | {
      kind: 'pick';
      pickId: string;
      name: string;
      mediaTypes?: string[];
    };

function withEditCredential(
  configId: string,
  editCredential: string,
  init?: RequestInit,
): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'x-metalayer-edit-credential': editCredential,
    },
  };
}

export async function fetchPublicMetaDBStatus(
  configId: string,
  editCredential: string,
): Promise<{ connected: boolean }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/status`,
    withEditCredential(configId, editCredential),
  );
}

export async function fetchPublicMetaDBLists(
  configId: string,
  editCredential: string,
  apiKey?: string,
): Promise<{ items: PublicMetaDBListSummary[] }> {
  const query = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/lists${query}`,
    withEditCredential(configId, editCredential),
  );
}

export async function fetchPublicMetaDBPicks(
  configId: string,
  editCredential: string,
  apiKey?: string,
): Promise<{ items: PublicMetaDBPickSummary[] }> {
  const query = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/picks${query}`,
    withEditCredential(configId, editCredential),
  );
}

export async function connectPublicMetaDB(
  configId: string,
  editCredential: string,
  apiKey: string,
): Promise<{ connected: boolean }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/connect`,
    withEditCredential(configId, editCredential, {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
  );
}

export async function disconnectPublicMetaDB(
  configId: string,
  editCredential: string,
): Promise<{ connected: boolean; removedCatalogs: number }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/disconnect`,
    withEditCredential(configId, editCredential, { method: 'DELETE' }),
  );
}

export async function importPublicMetaDBCatalogs(
  configId: string,
  editCredential: string,
  input: {
    apiKey?: string;
    selections: PublicMetaDBImportSelection[];
  },
): Promise<{
  imported: number;
  skipped: number;
  catalogs: CatalogListItem[];
  manifestOrder: ManifestCatalogEntry[];
}> {
  return apiFetch(
    `/api/v1/configurations/${configId}/sources/publicmetadb/import`,
    withEditCredential(configId, editCredential, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
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

export interface LegacyImportReportView {
  imported: string[];
  needsAttention: Array<{
    code: string;
    message: string;
    field?: string;
    params?: Record<string, string>;
  }>;
  secretsToVault: string[];
}

export interface LegacyImportDryRunResult {
  dryRun: true;
  report: LegacyImportReportView;
  config: { name?: string; catalogs?: unknown[] };
  correlationId?: string;
}

export interface LegacyImportPersistResult {
  dryRun: false;
  configId: string;
  manifestPath: string;
  report: LegacyImportReportView;
  correlationId?: string;
}

/** Accepts JSON object text, compressed legacy segment, or language-only string. */
export function parseLegacyImportInput(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('LEGACY_IMPORT_EMPTY');
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as unknown;
  }
  return trimmed;
}

export async function dryRunLegacyImport(
  legacy: unknown,
): Promise<LegacyImportDryRunResult> {
  return apiFetch('/api/v1/configurations/import-legacy', {
    method: 'POST',
    body: JSON.stringify({ dryRun: true, legacy }),
  });
}

export async function persistLegacyImport(
  legacy: unknown,
  editCredential: string,
): Promise<LegacyImportPersistResult> {
  return apiFetch('/api/v1/configurations/import-legacy', {
    method: 'POST',
    body: JSON.stringify({ dryRun: false, legacy, editCredential }),
  });
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
      name: {
        default: 'Trending Movies',
        values: {
          'pt-BR': 'Filmes em alta',
          'es-ES': 'Películas en tendencia',
        },
      },
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
      name: {
        default: 'Popular Series',
        values: {
          'pt-BR': 'Séries populares',
          'es-ES': 'Series populares',
        },
      },
      enabled: true,
      showInHome: true,
      position: 1,
      tags: [],
    },
    {
      instanceId: id(),
      provider: 'anilist',
      providerCatalogId: 'trending',
      mediaType: 'anime' as const,
      originalName: 'Trending Anime',
      name: {
        default: 'Trending Anime',
        values: {
          'pt-BR': 'Anime em alta',
          'es-ES': 'Anime en tendencia',
        },
      },
      enabled: true,
      showInHome: true,
      position: 2,
      tags: ['anime'],
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
    copySuffix?: string;
    locale?: string;
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
  warnings: Array<{ code: string; params?: Record<string, string | undefined> }>;
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
): Promise<{
  included: string[];
  excluded: string[];
  warnings: Array<{ rule: string; reason: string; fallback?: string }>;
}> {
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

export async function fetchGlobalSorting(
  configId: string,
  editCredential: string,
): Promise<{ globalSorting: SortingPlanDraft | null }> {
  return apiFetch(`/api/v1/configurations/${configId}/sorting`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
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

export interface FieldResolutionView {
  value: unknown;
  selectedProvider: string | null;
  attemptedProviders: string[];
  confidence: number;
  fallbackUsed: boolean;
  warnings: Array<{
    code: string;
    params?: Record<string, string | number | undefined>;
  }>;
  resolvedAt: string;
  requestedLocale?: string;
  selectedLocale?: string;
  exclusionReason?: string;
  attempts?: Array<{
    index: number;
    stepId: string;
    provider: string;
    status: string;
    resolvedLocale?: string;
    reason?: string;
    reasonParams?: Record<string, string | number>;
  }>;
  effectivePlanHash?: string;
}

export interface MetaInspectorReport {
  identity: {
    publicId?: string;
    mediaType?: string;
    matches: Record<string, string | number | undefined>;
  };
  localization: {
    metadataLocale: string;
    metadataFallbackLocales: string[];
    titleMode: string;
    descriptionMode: string;
  };
  fields: {
    title: FieldResolutionView;
    originalTitle: FieldResolutionView;
    description: FieldResolutionView;
    poster: FieldResolutionView;
    background: FieldResolutionView;
    logo?: FieldResolutionView;
    rating: FieldResolutionView;
    voteCount: FieldResolutionView;
    releaseDate: FieldResolutionView;
    externalIds: FieldResolutionView;
    displayTitle: string | null;
    displayDescription: string | null;
  };
  fieldProviders: Record<string, string[]>;
  timingMs: number;
}

export interface IdentityDiagnosticsView {
  canonicalId: string;
  entityKind: string;
  matches: Array<{ provider: string; id: string }>;
  edgeCount: number;
  edges: Array<{
    from: string;
    to: string;
    confidence: number;
    method: string;
    verified: boolean;
    evidence: string[];
  }>;
  unresolvedProviders: string[];
  warnings: Array<{
    code: string;
    params?: {
      from?: string;
      to?: string;
      confidence?: number;
      providers?: string;
    };
  }>;
}

export async function inspectMetadata(
  configId: string,
  editCredential: string,
  body: {
    id?: string;
    mediaType?: 'movie' | 'series' | 'anime';
    contributions?: Record<string, Array<Record<string, unknown>>>;
    apiKey?: string;
  },
): Promise<{
  report: MetaInspectorReport;
  identity?: { diagnostics: IdentityDiagnosticsView };
}> {
  return apiFetch(`/api/v1/configurations/${configId}/inspect`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export interface TrackingProviderStatus {
  provider: string;
  state: string;
  adapterAvailable: boolean;
}

export async function fetchTrackingStatus(
  configId: string,
  editCredential: string,
): Promise<{ providers: TrackingProviderStatus[] }> {
  return apiFetch(`/api/v1/configurations/${configId}/tracking/status`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function previewHideWatched(
  configId: string,
  editCredential: string,
  body: {
    hideWatched?: boolean;
    items?: Array<Record<string, unknown>>;
    fixtures?: Array<Record<string, unknown>>;
    failTracking?: boolean;
    provider?: string;
  },
): Promise<{
  included: string[];
  excluded: string[];
  degraded: boolean;
  ok: boolean;
}> {
  return apiFetch(
    `/api/v1/configurations/${configId}/tracking/preview-hide-watched`,
    {
      method: 'POST',
      headers: { 'x-metalayer-edit-credential': editCredential },
      body: JSON.stringify(body),
    },
  );
}

export async function fetchTraktAuthUrl(
  configId: string,
  editCredential: string,
  redirectUri: string,
): Promise<{ authUrl: string; state: string }> {
  return fetchTrackingAuthUrl(configId, editCredential, 'trakt', redirectUri);
}

export async function completeTraktOAuth(
  configId: string,
  editCredential: string,
  body: { code: string; redirectUri: string },
): Promise<{ connected: boolean; state: string }> {
  return completeTrackingOAuth(configId, editCredential, 'trakt', body);
}

export async function disconnectTrakt(
  configId: string,
  editCredential: string,
): Promise<{ connected: boolean; state: string }> {
  return disconnectTracking(configId, editCredential, 'trakt');
}

export type TrackingOAuthProvider = 'trakt' | 'simkl' | 'anilist' | 'mal';

export async function fetchTrackingAuthUrl(
  configId: string,
  editCredential: string,
  provider: TrackingOAuthProvider,
  redirectUri: string,
): Promise<{ authUrl: string; state: string }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/tracking/${provider}/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`,
    {
      headers: { 'x-metalayer-edit-credential': editCredential },
    },
  );
}

export async function completeTrackingOAuth(
  configId: string,
  editCredential: string,
  provider: TrackingOAuthProvider,
  body: { code: string; redirectUri: string; state?: string },
): Promise<{ connected: boolean; state: string }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/tracking/${provider}/callback`,
    {
      method: 'POST',
      headers: { 'x-metalayer-edit-credential': editCredential },
      body: JSON.stringify(body),
    },
  );
}

export async function disconnectTracking(
  configId: string,
  editCredential: string,
  provider: TrackingOAuthProvider,
): Promise<{ connected: boolean; state: string }> {
  return apiFetch(`/api/v1/configurations/${configId}/tracking/${provider}`, {
    method: 'DELETE',
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export interface CorrectionItem {
  id: string;
  type: string;
  target: { provider: string; id: string; entityKind?: string };
  reason: string;
  status: string;
  scope: string;
  payload: unknown;
  sources: Array<{ kind: string; label: string }>;
}

export async function fetchCorrections(
  configId: string,
  editCredential: string,
): Promise<{
  local: CorrectionItem[];
  community: CorrectionItem[];
  resolved: CorrectionItem[];
}> {
  return apiFetch(`/api/v1/configurations/${configId}/corrections`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function createLocalCorrection(
  configId: string,
  editCredential: string,
  body: {
    target: CorrectionItem['target'];
    type: string;
    payload: unknown;
    reason: string;
    sources?: CorrectionItem['sources'];
  },
): Promise<{ correction: CorrectionItem }> {
  return apiFetch(`/api/v1/configurations/${configId}/corrections`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export async function deleteLocalCorrection(
  configId: string,
  editCredential: string,
  correctionId: string,
): Promise<{ ok: boolean; rolledBack: string }> {
  return apiFetch(
    `/api/v1/configurations/${configId}/corrections/${correctionId}`,
    {
      method: 'DELETE',
      headers: { 'x-metalayer-edit-credential': editCredential },
    },
  );
}

export async function previewCorrections(
  configId: string,
  editCredential: string,
  body: {
    provider?: string;
    id?: string;
    base?: Record<string, unknown>;
    season?: number;
    episode?: number;
  },
): Promise<{
  applied: Record<string, unknown>;
  overlays: Array<Record<string, unknown>>;
  hidden: boolean;
}> {
  return apiFetch(`/api/v1/configurations/${configId}/corrections/preview`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export async function runCombinedSearch(
  configId: string,
  editCredential: string,
  query: string,
): Promise<{
  hits: Array<{ title: string; provider: string }>;
  warnings?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
}> {
  return apiFetch(`/api/v1/configurations/${configId}/search/combined`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ query }),
  });
}

export async function runSmartDiscovery(
  configId: string,
  editCredential: string,
  prompt: string,
): Promise<{
  plan: {
    mediaType: string;
    includeGenres?: string[];
    excludeGenres?: string[];
    runtimeMax?: number;
    assumptions?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
    warnings?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
  };
  proposal: {
    id: string;
    summary?: { code: string; params?: Record<string, string | number | undefined> };
    explanation: {
      interpretedIntent: { code: string; params?: Record<string, string | number | undefined> };
      assumptions?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
      warnings?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
    };
  };
}> {
  return apiFetch(`/api/v1/configurations/${configId}/search/smart-discovery`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ prompt }),
  });
}

export async function runRankedList(
  configId: string,
  editCredential: string,
  prompt: string,
): Promise<{
  unresolved: Array<{ title: string }>;
  duplicates: unknown[];
  explanation: {
    interpretedIntent: { code: string; params?: Record<string, string | number | undefined> };
    assumptions?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
    warnings?: Array<{ code: string; params?: Record<string, string | number | undefined> }>;
  };
  proposal: {
    id: string;
    summary?: { code: string; params?: Record<string, string | number | undefined> };
  };
}> {
  return apiFetch(`/api/v1/configurations/${configId}/search/ranked-list`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ prompt }),
  });
}

export async function applyAiProposal(
  configId: string,
  editCredential: string,
  body: { proposalId: string; confirm: boolean; name?: string },
): Promise<{ applied: string }> {
  return apiFetch(`/api/v1/configurations/${configId}/ai/apply-proposal`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export async function fetchResolutionConfig(
  configId: string,
  editCredential: string,
): Promise<{ resolution: import('@metalayer/config').ResolutionConfig; derived: boolean }> {
  return apiFetch(`/api/v1/configurations/${configId}/resolution`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function saveResolutionConfig(
  configId: string,
  editCredential: string,
  resolution: import('@metalayer/config').ResolutionConfig,
): Promise<{ resolution: import('@metalayer/config').ResolutionConfig }> {
  return apiFetch(`/api/v1/configurations/${configId}/resolution`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ resolution }),
  });
}

export interface ResolutionCompileResult {
  effective: {
    field: string;
    strategy: string;
    generatedSteps: Array<{
      id: string;
      provider: string;
      locale?: { type: string; value?: string };
    }>;
    effectivePlanHash: string;
    warnings: Array<{ code: string; params?: Record<string, unknown> }>;
  };
  correlationId: string;
}

export async function compileResolutionPlanApi(
  configId: string,
  editCredential: string,
  body: {
    field: string;
    mediaType?: 'movie' | 'series' | 'anime';
    profileId?: string;
    catalogId?: string;
  },
): Promise<ResolutionCompileResult> {
  return apiFetch(`/api/v1/configurations/${configId}/resolution/compile`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export interface ResolutionTestResult {
  status: 'resolved' | 'unresolved';
  field: string;
  value: unknown;
  selectedProvider: string | null;
  selectedLocale?: string;
  fallbackUsed: boolean;
  confidence?: number;
  attempts?: Array<{
    index: number;
    stepId: string;
    provider: string;
    status: string;
    resolvedLocale?: string;
    reason?: string;
    reasonParams?: Record<string, string | number>;
  }>;
  effectivePlanHash?: string;
  warnings: Array<{
    code: string;
    params?: Record<string, string | number | undefined>;
  }>;
  temporary?: boolean;
  correlationId: string;
}

export async function testResolutionPlan(
  configId: string,
  editCredential: string,
  body: {
    field: string;
    mediaType?: 'movie' | 'series' | 'anime';
    contributions?: Array<{
      provider: string;
      value?: unknown;
      locale?: string;
      confidence?: number;
    }>;
    originalLanguage?: string;
    plan?: import('@metalayer/config').FieldResolutionPlan;
  },
): Promise<ResolutionTestResult> {
  return apiFetch(`/api/v1/configurations/${configId}/resolution/test`, {
    method: 'POST',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify(body),
  });
}

export async function fetchLocalization(
  configId: string,
  editCredential: string,
): Promise<{ localization: import('@metalayer/config').LocalizationPreferences }> {
  return apiFetch(`/api/v1/configurations/${configId}/localization`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function saveLocalization(
  configId: string,
  editCredential: string,
  localization: import('@metalayer/config').LocalizationPreferences,
): Promise<{ localization: import('@metalayer/config').LocalizationPreferences }> {
  return apiFetch(`/api/v1/configurations/${configId}/localization`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ localization }),
  });
}

export async function fetchIdentityPreferences(
  configId: string,
  editCredential: string,
): Promise<{
  identity: import('@metalayer/config').IdentityPreferences;
  featureFlags: Record<string, boolean>;
}> {
  return apiFetch(`/api/v1/configurations/${configId}/identity`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function saveIdentityPreferences(
  configId: string,
  editCredential: string,
  identity: import('@metalayer/config').IdentityPreferences,
): Promise<{ identity: import('@metalayer/config').IdentityPreferences }> {
  return apiFetch(`/api/v1/configurations/${configId}/identity`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ identity }),
  });
}

export async function fetchCacheStats(): Promise<{
  cache: { hits: number; misses: number; size: number; stales: number };
}> {
  return apiFetch('/api/v1/cache/stats');
}

export async function fetchProfiles(
  configId: string,
  editCredential: string,
): Promise<{ profiles: import('@metalayer/config').ProfileDefinition[] }> {
  return apiFetch(`/api/v1/configurations/${configId}/profiles`, {
    headers: { 'x-metalayer-edit-credential': editCredential },
  });
}

export async function saveProfiles(
  configId: string,
  editCredential: string,
  profiles: import('@metalayer/config').ProfileDefinition[],
): Promise<{ profiles: import('@metalayer/config').ProfileDefinition[] }> {
  return apiFetch(`/api/v1/configurations/${configId}/profiles`, {
    method: 'PUT',
    headers: { 'x-metalayer-edit-credential': editCredential },
    body: JSON.stringify({ profiles }),
  });
}

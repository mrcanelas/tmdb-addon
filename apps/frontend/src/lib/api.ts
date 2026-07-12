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
      provider: 'anilist',
      providerCatalogId: 'trending',
      mediaType: 'anime' as const,
      originalName: 'Trending Anime',
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

export interface FieldResolutionView {
  value: unknown;
  selectedProvider: string | null;
  attemptedProviders: string[];
  confidence: number;
  fallbackUsed: boolean;
  warnings: Array<{ code: string; message: string }>;
  resolvedAt: string;
  requestedLocale?: string;
  selectedLocale?: string;
  exclusionReason?: string;
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
  warnings: string[];
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
): Promise<{ hits: Array<{ title: string; provider: string }> }> {
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
  };
  proposal: {
    id: string;
    explanation: { interpretedIntent: string };
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
  explanation: { interpretedIntent: string };
  proposal: { id: string };
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

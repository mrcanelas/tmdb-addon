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
}

export interface ManifestCatalogEntry {
  instanceId: string;
  id: string;
  type: 'movie' | 'series' | 'anime';
  name: string;
  showInHome: boolean;
}

export type StudioCatalogAction =
  | 'rename'
  | 'duplicate'
  | 'move'
  | 'enable'
  | 'disable'
  | 'showInHome'
  | 'hideInHome';

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

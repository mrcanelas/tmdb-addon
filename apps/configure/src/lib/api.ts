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

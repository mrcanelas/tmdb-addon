import { classifyHttpStatus, ProviderError } from '../core/errors.js';
import type { ProviderFetch } from '../artwork/types.js';

export const PUBLIC_METADB_BASE_URL = 'https://publicmetadb.com';

export type PublicMetaDBMediaType = 'movie' | 'tv';

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
  filters?: {
    media_types?: string[];
  };
}

export interface PublicMetaDBMediaRef {
  tmdb_id: number;
  media_type: PublicMetaDBMediaType;
  season?: number;
  episode?: number;
}

export interface PublicMetaDBPaginated<T> {
  items?: T[];
  page?: number;
  perPage?: number;
  total?: number;
}

export function isPublicMetaDBApiKey(apiKey: string): boolean {
  return apiKey.startsWith('pm-');
}

export function buildPublicMetaDBUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_METADB_BASE_URL}${normalized}`;
}

export async function publicMetaDBRequest<T>(options: {
  path: string;
  apiKey: string;
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
  providerId?: string;
}): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const providerId = options.providerId ?? 'publicmetadb';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.correlationId) {
    headers['X-Correlation-Id'] = options.correlationId;
  }

  const response = await fetchImpl(buildPublicMetaDBUrl(options.path), {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 || response.status === 403) {
    throw classifyHttpStatus(response.status, providerId);
  }
  if (!response.ok) {
    throw new ProviderError({
      code: response.status === 429 ? 'rate_limited' : 'upstream',
      providerId,
      message: `PublicMetaDB ${options.method ?? 'GET'} ${options.path} failed (${response.status})`,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

export async function validatePublicMetaDBKey(options: {
  apiKey: string;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<boolean> {
  try {
    await publicMetaDBRequest<PublicMetaDBPaginated<PublicMetaDBListSummary>>({
      path: '/api/external/lists?perPage=1',
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      correlationId: options.correlationId,
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchPublicMetaDBResume(options: {
  apiKey: string;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<PublicMetaDBMediaRef[]> {
  const data = await publicMetaDBRequest<PublicMetaDBPaginated<PublicMetaDBMediaRef>>({
    path: '/api/external/resume',
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
  return data.items ?? [];
}

export async function fetchPublicMetaDBLists(options: {
  apiKey: string;
  page?: number;
  perPage?: number;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<PublicMetaDBPaginated<PublicMetaDBListSummary>> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 50;
  return publicMetaDBRequest({
    path: `/api/external/lists?page=${page}&perPage=${perPage}`,
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
}

export async function fetchPublicMetaDBListItems(options: {
  apiKey: string;
  listId: string;
  page?: number;
  perPage?: number;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<PublicMetaDBPaginated<PublicMetaDBMediaRef>> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 20;
  return publicMetaDBRequest({
    path: `/api/external/lists/${encodeURIComponent(options.listId)}/items?page=${page}&perPage=${perPage}`,
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
}

export async function fetchPublicMetaDBPicks(options: {
  apiKey: string;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<PublicMetaDBPaginated<PublicMetaDBPickSummary>> {
  return publicMetaDBRequest({
    path: '/api/external/catalogs',
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
}

export async function fetchPublicMetaDBPickItems(options: {
  apiKey: string;
  pickId: string;
  page?: number;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<PublicMetaDBPaginated<PublicMetaDBMediaRef>> {
  const page = options.page ?? 1;
  return publicMetaDBRequest({
    path: `/api/external/catalogs/${encodeURIComponent(options.pickId)}/items?page=${page}`,
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
}

export async function markPublicMetaDBWatched(options: {
  apiKey: string;
  tmdbId: number;
  mediaType: PublicMetaDBMediaType;
  season?: number;
  episode?: number;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  correlationId?: string;
}): Promise<{ success?: boolean }> {
  const body: Record<string, unknown> = {
    tmdb_id: options.tmdbId,
    media_type: options.mediaType,
  };
  if (options.mediaType === 'tv' && options.season != null && options.episode != null) {
    body.season = options.season;
    body.episode = options.episode;
  }

  return publicMetaDBRequest({
    path: '/api/external/watched?dedupe=true',
    apiKey: options.apiKey,
    method: 'POST',
    body,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    correlationId: options.correlationId,
  });
}

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env.PUBLIC_METALAYER_API_BASE || '';

export function getDashboardToken(): string {
  return sessionStorage.getItem('metalayer.dashboardToken') ?? '';
}

export function setDashboardToken(token: string): void {
  sessionStorage.setItem('metalayer.dashboardToken', token);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getDashboardToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'x-metalayer-dashboard-token': token } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(body?.message ?? 'Request failed'), {
      code: body?.code,
      status: response.status,
    });
  }
  return body as T;
}

export function fetchOverview() {
  return apiFetch<{
    health: {
      status: string;
      mode: string;
      version: string;
      uptimeSeconds: number;
      activeConfigurations?: number;
      metrics: Record<string, unknown>;
    };
    modules: string[];
  }>('/api/v1/dashboard/overview');
}

export function fetchLogs() {
  return apiFetch<{ logs: Array<{ id: string; level: string; message: string; at: string }> }>(
    '/api/v1/dashboard/logs?limit=30',
  );
}

export interface DashboardProviderState {
  id: string;
  enabled: boolean;
  configured: boolean;
  source: 'env' | 'admin' | 'default';
}

export function fetchProviders() {
  return apiFetch<{ providers: DashboardProviderState[] }>(
    '/api/v1/dashboard/providers',
  );
}

export function updateProvider(
  providerId: string,
  patch: { enabled?: boolean; configured?: boolean },
) {
  return apiFetch<{ provider: DashboardProviderState }>(
    `/api/v1/dashboard/providers/${encodeURIComponent(providerId)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  );
}

export function updateProviderSecret(
  providerId: string,
  kind: 'api_key' | 'client_id' | 'client_secret',
  plaintext: string,
) {
  return apiFetch<{
    provider: DashboardProviderState;
    secretStates: Record<string, string>;
  }>(
    `/api/v1/dashboard/providers/${encodeURIComponent(providerId)}/secrets/${kind}`,
    { method: 'PUT', body: JSON.stringify({ plaintext }) },
  );
}

export function createBackup() {
  return apiFetch<{ backup: { includesSecrets: boolean; configurations: unknown[] } }>(
    '/api/v1/dashboard/backups',
    { method: 'POST' },
  );
}

export function fetchUpdates() {
  return apiFetch<{
    currentVersion: string;
    notes: string[];
    upgradeCommand: string;
  }>('/api/v1/dashboard/updates');
}

export function fetchSettings() {
  return apiFetch<{
    mode: string;
    restartPending?: boolean;
    settings: RuntimeSettingView[];
  }>('/api/v1/dashboard/settings');
}

export interface RuntimeSettingView {
  key: string;
  description: string;
  reload: string;
  type: 'boolean' | 'string' | 'number' | 'url';
  editable: boolean;
  secret: boolean;
  source: 'env' | 'stored' | 'default';
  value: string | number | boolean | null;
  configured: boolean;
  restartRequired: boolean;
}

export function updateSetting(key: string, value: unknown) {
  return apiFetch<{ setting: RuntimeSettingView; restartRequired: boolean }>(
    `/api/v1/dashboard/settings/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ value }),
    },
  );
}

export function clearSetting(key: string) {
  return apiFetch<{ setting: RuntimeSettingView; restartRequired: boolean }>(
    `/api/v1/dashboard/settings/${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}

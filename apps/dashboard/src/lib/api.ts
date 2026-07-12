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

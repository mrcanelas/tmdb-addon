/**
 * SSRF guards for server-side URL fetches (AGENTS.md §30.1).
 * Used for optional Fribb live download, custom artwork URLs, and proxy targets.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;
  const ranges: Array<[number, number]> = [
    [ipv4ToInt('0.0.0.0')!, ipv4ToInt('0.255.255.255')!],
    [ipv4ToInt('10.0.0.0')!, ipv4ToInt('10.255.255.255')!],
    [ipv4ToInt('127.0.0.0')!, ipv4ToInt('127.255.255.255')!],
    [ipv4ToInt('169.254.0.0')!, ipv4ToInt('169.254.255.255')!],
    [ipv4ToInt('172.16.0.0')!, ipv4ToInt('172.31.255.255')!],
    [ipv4ToInt('192.168.0.0')!, ipv4ToInt('192.168.255.255')!],
    [ipv4ToInt('224.0.0.0')!, ipv4ToInt('255.255.255.255')!],
  ];
  return ranges.some(([from, to]) => value >= from && value <= to);
}

function isBlockedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  return false;
}

export interface AssertSafeRemoteUrlOptions {
  /** When set, hostname must be in this allowlist (exact or suffix match with leading '.'). */
  allowHosts?: readonly string[];
  /** Allowed protocols. Default https only. */
  protocols?: readonly string[];
}

export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED';
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/**
 * Validate a remote URL before fetch. Throws {@link SsrfBlockedError} when unsafe.
 * Does not perform DNS resolution — callers that resolve hosts must re-check addresses.
 */
export function assertSafeRemoteUrl(
  raw: string,
  options: AssertSafeRemoteUrlOptions = {},
): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfBlockedError('Invalid URL');
  }

  const protocols = options.protocols ?? ['https:'];
  if (!protocols.includes(url.protocol)) {
    throw new SsrfBlockedError(`Protocol ${url.protocol} is not allowed`);
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError('Hostname is blocked');
  }

  if (hostname.includes(':') || hostname.startsWith('[')) {
    if (isBlockedIpv6(hostname)) {
      throw new SsrfBlockedError('IPv6 loopback/link-local/ULA is blocked');
    }
  } else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateOrReservedIpv4(hostname)) {
      throw new SsrfBlockedError('Private or reserved IPv4 is blocked');
    }
  }

  if (options.allowHosts && options.allowHosts.length > 0) {
    const allowed = options.allowHosts.some((host) => {
      const needle = host.toLowerCase();
      return hostname === needle || hostname.endsWith(`.${needle}`);
    });
    if (!allowed) {
      throw new SsrfBlockedError(`Host ${hostname} is not on the allowlist`);
    }
  }

  return url;
}

export interface SafeFetchOptions extends AssertSafeRemoteUrlOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Fetch a remote resource with protocol/host checks, redirect re-validation,
 * response size cap, and timeout. Suitable for artwork / mapping datasets.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let current = assertSafeRemoteUrl(rawUrl, options);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: options.headers,
        signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new SsrfBlockedError('Redirect without Location');
        current = assertSafeRemoteUrl(new URL(location, current).toString(), options);
        continue;
      }
      const length = Number(response.headers.get('content-length') ?? NaN);
      if (Number.isFinite(length) && length > maxBytes) {
        throw new SsrfBlockedError(`Response exceeds ${maxBytes} bytes`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) {
        throw new SsrfBlockedError(`Response exceeds ${maxBytes} bytes`);
      }
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }
  throw new SsrfBlockedError('Too many redirects');
}

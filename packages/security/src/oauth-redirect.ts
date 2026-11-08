export type OAuthTrackingProvider = 'trakt' | 'simkl' | 'anilist' | 'mal';

export interface OAuthRedirectAllowOptions {
  provider: OAuthTrackingProvider;
  /** Provider-specific env redirect (e.g. TRAKT_REDIRECT_URI). */
  envRedirectUri?: string;
  /** Instance public origin used to build the canonical configure callback. */
  publicBaseUrl?: string;
  /** Comma-separated extra exact URIs (METALAYER_OAUTH_REDIRECT_URIS). */
  extraAllowlist?: string;
}

function canonicalCallbackPath(provider: OAuthTrackingProvider): string {
  return `/configure/oauth/${provider}/callback`;
}

function normalizeRedirectUri(redirectUri: string): string {
  const url = new URL(redirectUri);
  url.hash = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.href;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function parseExtraAllowlist(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Returns whether an OAuth redirect URI is safe for this MetaLayer instance.
 * Blocks open redirects to arbitrary hosts while allowing self-host via env
 * allowlist, public base URL, and loopback configure callbacks (AGENTS.md §30).
 */
export function isAllowedOAuthRedirectUri(
  redirectUri: string,
  options: OAuthRedirectAllowOptions,
): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;

  const expectedPath = canonicalCallbackPath(options.provider);
  const pathOk =
    url.pathname === expectedPath || url.pathname === `${expectedPath}/`;

  let normalized: string;
  try {
    normalized = normalizeRedirectUri(redirectUri);
  } catch {
    return false;
  }

  const candidates = [
    options.envRedirectUri,
    ...parseExtraAllowlist(options.extraAllowlist),
  ];

  if (options.publicBaseUrl?.trim()) {
    try {
      candidates.push(
        new URL(expectedPath, options.publicBaseUrl.trim()).href,
      );
    } catch {
      // ignore invalid public base
    }
  }

  for (const allowed of candidates) {
    if (!allowed) continue;
    try {
      if (normalizeRedirectUri(allowed) === normalized) return true;
    } catch {
      // skip invalid allowlist entries
    }
  }

  // Local development: loopback + canonical configure path only.
  if (isLoopbackHost(url.hostname) && pathOk) return true;

  return false;
}

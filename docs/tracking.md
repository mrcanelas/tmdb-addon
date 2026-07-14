# Tracking

Tracking integrations expose watch state (and related previews) without breaking metadata when tokens fail or expire.

Package: `@metalayer/tracking`. Configure UI: `/configure/sources/tracking` (hub: `/configure/sources`).

Canonical product rules: `AGENTS.md` §20. Phase foundations: `docs/phase-i-exit.md`. OAuth redirect allowlist: `docs/security.md`. Deployment refresh jobs: `docs/deployment.md`.

## Providers (beta)

| Provider | OAuth in configure | Refresh grant | Notes |
|---|---|---|---|
| Trakt | Yes | Yes | `TRAKT_CLIENT_ID` / `TRAKT_CLIENT_SECRET` |
| SIMKL | Yes | No | `SIMKL_CLIENT_ID` / `SIMKL_CLIENT_SECRET` |
| AniList | Yes | No | `ANILIST_CLIENT_ID` / `ANILIST_CLIENT_SECRET` |
| MAL | Yes | Yes (PKCE) | `MAL_CLIENT_ID` / `MAL_CLIENT_SECRET` |

Connection states include `not_configured`, `connected`, `expired`, `invalid`, `reconnect_required`, and `degraded`. Failures should disable only tracking-dependent features and keep unrelated metadata working.

## Operator flow

1. Open `/configure/sources/tracking` for a persistent configuration.
2. Connect a provider (browser OAuth). Redirect URIs must pass the instance allowlist (`docs/security.md`).
3. Tokens are stored in the Secret Vault as `oauth_access` / `oauth_refresh` kinds — never in the manifest URL or default exports.
4. Use **Preview hide watched** to validate hide-watched against live (or degraded) watch state.
5. Disconnect clears vaulted access tokens for that provider (refresh may be retained when reconnect is expected).

## Management API

All routes require a valid edit credential (`X-MetaLayer-Edit-Credential`) unless noted otherwise. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/tracking/status` | Per-provider connection state + adapter availability |
| POST | `/configurations/:configId/tracking/:provider/refresh` | Attempt token refresh for a refreshable provider |
| POST | `/configurations/:configId/tracking/lookup` | Resolve watch-state lookup helpers |
| POST | `/configurations/:configId/tracking/preview-hide-watched` | Evaluate hide-watched; returns `degraded: true` when tracking fails safely |
| GET | `/configurations/:configId/tracking/{trakt\|simkl\|anilist\|mal}/auth-url` | Build authorize URL (`redirectUri` allowlisted) |
| POST | `/configurations/:configId/tracking/{trakt\|simkl\|anilist\|mal}/callback` | Exchange authorization code → vault |
| DELETE | `/configurations/:configId/tracking/{trakt\|simkl\|anilist\|mal}` | Disconnect provider |

## Proactive refresh

- CLI: `pnpm metalayer:tracking-refresh` (supports `--dry-run`)
- Optional in-process scheduler: `METALAYER_TRACKING_REFRESH_ENABLED=true` (interval via `METALAYER_TRACKING_REFRESH_INTERVAL_MS`)

Refresh applies to providers with a refresh grant (Trakt, MAL). Never logs tokens or vault plaintext.

## Still follow-up (not blocking Phase I exit)

- Richer live watchlist/history sync and check-in write paths
- Native Stremio catalog rows driven solely by remote tracking lists

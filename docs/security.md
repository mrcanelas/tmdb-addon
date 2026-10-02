# Security

Canonical product rules: `AGENTS.md` §23 (Secret Vault) and §30 (Security requirements).
Operator / contributor policy overview: root `SECURITY.md`.

## Phase M hardening (landed)

| Area | Status |
|---|---|
| Secrets out of manifest URLs | Done — native `/c/:configId/...` |
| Secret Vault AES-256-GCM at rest | Done — ADR 0005 |
| Key ring + vault reencrypt CLI | Done — `pnpm metalayer:vault-reencrypt` |
| Log redaction (edit credential, vault, OAuth, dashboard token) | Done — `@metalayer/security` |
| OAuth `redirectUri` allowlist | Done — see below |
| Safe default exports (no secrets) | Done |
| Formal security review sign-off | **Done (MVP)** — Phase M review closed CSRF OAuth state + log redact hardening; residual items tracked below |
| Admin-first instance secrets | **Documented** — prefer Dashboard over day-two `.env` (ADR 0008); implementation Open |

## Logging and redaction

Operator logs and Fastify request logs must not persist:

- edit credentials (`x-metalayer-edit-credential`, body `editCredential`);
- Secret Vault payloads and API keys (`req.body.apiKey` / `body.apiKey` included in Fastify redact paths);
- OAuth access / refresh tokens;
- dashboard operator tokens (`x-metalayer-dashboard-token`).

Implementation: `redactSensitive` and `FASTIFY_LOG_REDACT_PATHS` in `@metalayer/security`.

## OAuth redirect allowlist

Tracking OAuth `redirectUri` values (auth-url query and callback body) are allowlisted:

1. Exact match of the provider env URI (`TRAKT_REDIRECT_URI`, `SIMKL_REDIRECT_URI`, `ANILIST_REDIRECT_URI`, `MAL_REDIRECT_URI`);
2. Exact match of `METALAYER_PUBLIC_BASE_URL` + `/configure/oauth/{provider}/callback`;
3. Exact entries in comma-separated `METALAYER_OAUTH_REDIRECT_URIS`;
4. Loopback hosts (`localhost`, `127.0.0.1`, `::1`) with the canonical configure callback path (local development).

Arbitrary third-party hosts are rejected with `VALIDATION_FAILED` even when the path looks like a MetaLayer callback.

Self-hosted public instances should set `METALAYER_PUBLIC_BASE_URL` and/or each provider `*_REDIRECT_URI`.

## OAuth callback state (CSRF)

Tracking OAuth callbacks for Trakt, SIMKL, AniList, and MAL require a `state` value created at auth-url time:

1. Server mints a nonce and stores it in the Secret Vault `session` secret for that provider;
2. `state` encodes `{ configId, nonce }` (base64url JSON);
3. Callback rejects missing, malformed, wrong-config, or nonce-mismatched `state`;
4. Successful validation consumes the vaulted session (one-time use). MAL still carries PKCE `codeVerifier` inside that session payload.

## Phase M review notes (2026-07-13)

| Finding | Severity | Resolution |
|---|---|---|
| OAuth callbacks accepted codes without validating `state`/nonce (Trakt/SIMKL/AniList; MAL partial) | Medium | Fixed — shared `beginOAuthSession` / `assertOAuthCallbackState` |
| Fastify redact paths omitted `req.body.apiKey` | Low | Fixed — added to `FASTIFY_LOG_REDACT_PATHS` |

Residual / follow-up (not Phase M blockers): full operator threat model for multi-tenant Server mode, independent external pen-test before stable `1.0.0`.

## SSRF and rate limits (beta.2+)

- `assertSafeRemoteUrl` / `safeFetch` in `@metalayer/security` block non-HTTPS, loopback, link-local, and RFC1918 targets; optional host allowlists; redirect re-validation; response size and timeout caps. Fribb live fetch keeps a dedicated allowlist in `@metalayer/anime`.
- In-process rate limiting on the Fastify app (`apps/server/src/plugins/rate-limit.ts`) returns `429` / `RATE_LIMITED`. Tunables: `METALAYER_RATE_LIMIT_MAX`, `METALAYER_RATE_LIMIT_WINDOW_MS` (Dashboard Settings once W5 lands).

## Related

- Deployment / encryption env: `docs/deployment.md`
- Admin-first instance config: `docs/adr/0008-admin-first-instance-config.md`, `docs/dashboard.md`
- Telemetry defaults off: `docs/telemetry.md`
- Legacy import vaults secrets: `docs/migration-from-tmdb-addon.md`


### Request URL logging

Request serializers and error buffers redact query strings and legacy compressed URL segments. New browser clients send provider keys in `X-MetaLayer-Api-Key` or use vault credentials. Legacy query-key inputs remain accepted for compatibility, but clients should migrate. Production smoke uses fake sentinels to check that request logs do not expose them.

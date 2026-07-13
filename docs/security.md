# Security

Canonical product rules: `AGENTS.md` §23 (Secret Vault) and §30 (Security requirements).
Operator / contributor policy overview: root `SECURITY.md`.

## Logging and redaction

Operator logs and Fastify request logs must not persist:

- edit credentials (`x-metalayer-edit-credential`, body `editCredential`);
- Secret Vault payloads and API keys;
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

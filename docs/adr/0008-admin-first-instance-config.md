# ADR 0008: Admin-first instance configuration

- Status: Accepted
- Date: 2026-07-13
- Deciders: MetaLayer maintainers

## Context

MetaLayer historically leaned on process environment variables for operator secrets (Trakt/SIMKL/AniList/MAL client credentials, Fanart, Redis/Postgres URLs, proxy, cache limits). That forces operators to edit `.env` and restart for day-two changes, and makes Configure show providers that the instance cannot actually back with app credentials.

Configure end users also need a clear split between **instance** app credentials and **per-configuration** user secrets (TMDB API key, OAuth access tokens).

## Decision

1. Prefer the **Dashboard Admin** (`/admin` Providers + Settings) for instance-level enablement and secrets after bootstrap.
2. Keep **bootstrap / sovereignty** values in the environment only: `METALAYER_ENCRYPTION_KEY` (and key ring), `METALAYER_DASHBOARD_TOKEN`, listen ports / public base URL, optional first-boot SQLite path.
3. Store Admin-managed secrets in the Secret Vault (or instance settings store) with the same redaction and export rules as configuration secrets (`AGENTS.md` §23–§24).
4. **Gate Configure availability:** providers not configured or not enabled at the instance level must not appear as available Sources, Resolution Chains pickers, or Tracking connect targets that require instance OAuth apps.
5. Every Admin setting declares restart semantics: hot-reload, worker restart, full process restart, or immutable after startup.

Canonical product rules: `AGENTS.md` §8.1.1, §24.6. Operator inventory: `docs/deployment.md`, `docs/dashboard.md`.

## Consequences

### Positive

- Smaller day-two `.env` surface.
- Configure cannot pretend an unconfigured provider works.
- Clearer separation of instance vs configuration secrets.

### Negative / follow-up

- Requires Dashboard Providers/Settings UI and APIs beyond the current MVP.
- Changing Postgres/Redis from Admin may still require a process restart.
- Migration path needed from env-only installs (read env as defaults until Admin saves override).

## Alternatives considered

- **Env-only forever** — rejected; fights self-host UX goals.
- **Single vault mixing instance and user secrets without scopes** — rejected; hard to authorize and export safely.
- **Configure-only provider secrets for OAuth apps** — rejected; OAuth *client* credentials belong to the instance operator, not each MetaLayer config.

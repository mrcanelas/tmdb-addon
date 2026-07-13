# Dashboard (Admin)

Operator UI for MetaLayer instances (`apps/dashboard`, basename `/admin`). Product rules: `AGENTS.md` §24. Deployment: `docs/deployment.md`. ADR: `docs/adr/0008-admin-first-instance-config.md`.

## Audience

Instance operators only. Never mix with end-user `/configure` flows.

Protect with `METALAYER_DASHBOARD_TOKEN` (`x-metalayer-dashboard-token`).

## Modules (target)

Overview, Health, **Providers**, Users, Configurations, Requests, Errors, Cache, Database, Workers, Logs, Security, Backups, Updates, **Settings**.

Beta MVP exposes a thinner subset (overview, logs, backups, updates) and will grow toward Providers/Settings for Admin-first configuration.

## Admin-first configuration

Prefer Admin over new env vars for day-two operations:

| Area | Examples |
|---|---|
| Providers | Fanart API key; Trakt / SIMKL / AniList / MAL `CLIENT_ID` + `CLIENT_SECRET`; optional instance TMDB key; enable/disable |
| Settings | `REDIS_URL`, `POSTGRES_URL` (after Lite bootstrap), cache limits/TTLs, TMDB proxy, telemetry, tracking-refresh scheduler |

Remain in environment (bootstrap): encryption key (+ ring), dashboard token, ports / public base URL, first-boot SQLite path.

### Configure availability gate

If a provider is not configured or not enabled in Admin Providers, Configure must not list it as available (`AGENTS.md` §8.1.1). Capability and Sources APIs must enforce the same filter.

## Runtime settings semantics

Each Settings field declares:

- hot-reload supported;
- worker restart required;
- full process restart required;
- immutable after startup.

## Related

- Secret Vault scopes — `AGENTS.md` §23
- Provider health — `docs/sources.md`
- Frontend shell — `FRONTEND.md`

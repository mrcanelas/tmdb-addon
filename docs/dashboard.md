# Dashboard (Admin)

Operator UI for MetaLayer instances (`apps/dashboard`, basename `/admin`). Product rules: `AGENTS.md` §24. Deployment: `docs/deployment.md`. ADR: `docs/adr/0008-admin-first-instance-config.md`.

## Audience

Instance operators only. Never mix with end-user `/configure` flows.

Protect with `METALAYER_DASHBOARD_TOKEN` (`x-metalayer-dashboard-token`).

## Modules (target)

Overview, Health, **Providers**, Users, Configurations, Requests, Errors, Cache, Database, Workers, Logs, Security, Backups, Updates, **Settings**.

Beta MVP includes overview, health, logs, backups, updates, **Providers**, and editable **Settings**.

## Admin-first configuration

Prefer Admin over new env vars for day-two operations:

| Area | Examples |
|---|---|
| Providers | Fanart API key; Trakt / SIMKL / AniList / MAL `CLIENT_ID` + `CLIENT_SECRET`; optional instance TMDB key; enable/disable |
| Settings | Telemetry, tracking-refresh, catalog scan/sort budgets, cache TTLs, rate limits, TMDB proxy, `REDIS_URL`, `POSTGRES_URL` |

Remain in environment (bootstrap): encryption key (+ ring), dashboard token, ports / public base URL, first-boot SQLite path.

Settings API: `GET/PUT/DELETE /api/v1/dashboard/settings[/:key]`. Values persist in `instance_settings` (secrets masked on read). Hot keys apply in-process; `process-restart` keys set a restart-pending flag.

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

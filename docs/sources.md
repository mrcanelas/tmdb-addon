# Sources

Sources are external providers for metadata, artwork, ratings, catalogs, tracking, and related capabilities.

Configure UI: `/configure/sources`. Canonical categories and source cards: `AGENTS.md` §8. Instance enablement / Admin gate: `AGENTS.md` §8.1.1, ADR 0008, `docs/dashboard.md`. Resilience: `AGENTS.md` §29. Phase C exit: `docs/phase-c-exit.md`.

## Instance availability

Operators configure provider **app credentials** and enablement in Admin (`/admin/providers`). Configure lists only providers that are available for the instance. Unconfigured OAuth apps (Trakt, SIMKL, AniList, MAL client id/secret) and required artwork keys (e.g. Fanart) keep those providers out of Sources, Resolution Chains pickers, and Tracking connect when the feature depends on them.

Per-configuration secrets (user TMDB API key, user OAuth tokens) remain separate from instance app credentials.

## Configure UI

Each source card shows name, categories, adapter availability, connection state, capability chips, and a connectivity **Test** (optional API key when required). Connect/Disconnect OAuth controls remain stubs where browser OAuth is not wired on Sources (Tracking has its own OAuth flows).

Test success/failure uses live regions (`role=status` / `role=alert`). Health after test reflects the process circuit-breaker snapshot when present.

## Diagnostics API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/sources` | Registered providers, capabilities, adapter availability, health snapshot (no secrets) — **must respect instance availability** |
| GET | `/api/v1/sources/:providerId` | One provider + locale-adapter sample |
| POST | `/api/v1/sources/:providerId/test` | Connectivity ping; optional vaulted credentials via `configId` + edit credential header |

Also: `GET /api/v1/dashboard/health` exposes a `providers` map for operators.

## Circuit breakers

Adapters created through the server share a process-scoped `ProviderHealthRegistry`. Consecutive failures open the circuit (`circuit_open`) until the open window elapses. Health is visible on Sources and the dashboard health endpoint.

## Still follow-up

- Admin Providers UI + instance vault for OAuth client secrets (replace env-only day-two setup)
- Enforce instance availability filter end-to-end on Sources and Resolution pickers
- First-class Connect/Disconnect on Sources for providers that OAuth elsewhere
- Per-source last success/failure timestamps and latency charts in configure
- Redis-shared health for multi-instance Server mode

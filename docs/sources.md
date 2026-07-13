# Sources

Sources are external providers for metadata, artwork, ratings, catalogs, tracking, and related capabilities.

Configure UI: `/configure/sources`. Canonical categories and source cards: `AGENTS.md` §8. Resilience: `AGENTS.md` §29. Phase C exit: `docs/phase-c-exit.md`.

## Configure UI

Each source card shows name, categories, adapter availability, connection state, capability chips, and a connectivity **Test** (optional API key when required). Connect/Disconnect OAuth controls remain stubs where browser OAuth is not wired on Sources (Tracking has its own OAuth flows).

Test success/failure uses live regions (`role=status` / `role=alert`). Health after test reflects the process circuit-breaker snapshot when present.

## Diagnostics API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/sources` | Registered providers, capabilities, adapter availability, health snapshot (no secrets) |
| GET | `/api/v1/sources/:providerId` | One provider + locale-adapter sample |
| POST | `/api/v1/sources/:providerId/test` | Connectivity ping; optional vaulted credentials via `configId` + edit credential header |

Also: `GET /api/v1/dashboard/health` exposes a `providers` map for operators.

## Circuit breakers

Adapters created through the server share a process-scoped `ProviderHealthRegistry`. Consecutive failures open the circuit (`circuit_open`) until the open window elapses. Health is visible on Sources and the dashboard health endpoint.

## Still follow-up

- First-class Connect/Disconnect on Sources for providers that OAuth elsewhere
- Per-source last success/failure timestamps and latency charts in configure
- Redis-shared health for multi-instance Server mode

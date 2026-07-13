# Sources

Sources are external providers for metadata, artwork, ratings, catalogs, and tracking.

## Diagnostics

- `GET /api/v1/sources` — registered providers, capabilities, adapter availability, and **current health snapshot** from the process-scoped circuit-breaker registry (no secrets).
- `GET /api/v1/sources/:providerId` — one provider plus locale-adapter sample.
- `POST /api/v1/sources/:providerId/test` — connectivity ping; optional vaulted credentials via `configId` + edit credential header.

## Circuit breakers

Adapters created through the server share a `ProviderHealthRegistry` for the process. Consecutive failures open the circuit (`circuit_open`) until the open window elapses. Health is visible on Sources and on `GET /api/v1/dashboard/health` (`providers` map).

See AGENTS.md §8 (Sources) and §29 (Resilience).

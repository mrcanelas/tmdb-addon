# Phase C exit checklist (Provider framework)

Status: **partial** — shared provider contracts, locale-sensitive memory cache, TMDB/Fanart/RPDB adapters, ratings stub, and API diagnostics/preview exist.
IMDb rating fetchers and Redis shared cache remain.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Provider interfaces | Done | `ProviderAdapter`, `ProviderContext`, errors |
| Capability registry | Done | existing `PROVIDER_REGISTRY` |
| Provider locale adapters | Done | TMDB, language-only, unsupported |
| Localized capability declarations | Done | registry + locale adapters |
| Locale-sensitive cache strategy | Done | `@metalayer/cache` + TMDB adapter cache keys |
| Provider health | Done | tracker + circuit breaker |
| Timeout and retry policies | Done | `withTimeout` / `withRetry` |
| TMDB adapter | Done | ping, getMovie, searchMovies (injectable fetch + cache) |
| Artwork adapters | Done | Fanart movie artwork + RPDB poster URL builder/ping |
| Rating adapters | Stub | IMDb unsupported stub |
| Provider diagnostics | Done | `/api/v1/sources`, `/preview/movie/:id`, `/cache/stats` |

## Exit criterion (AGENTS.md §37 Phase C)

> core is provider-neutral.

Satisfied for the packages layer: core code depends on `ProviderAdapter` / locale contracts, not TMDB HTTP details.
Runtime catalog/meta routes still use the legacy addon until later phases swap them over.

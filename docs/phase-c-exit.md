# Phase C exit checklist (Provider framework)

Status: **partial** — shared provider contracts, locale adapters, TMDB metadata adapter, artwork/ratings stubs, and API source diagnostics exist.
Full artwork/rating fetchers and production response caches remain.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Provider interfaces | Done | `ProviderAdapter`, `ProviderContext`, errors |
| Capability registry | Done | existing `PROVIDER_REGISTRY` |
| Provider locale adapters | Done | TMDB, language-only, unsupported |
| Localized capability declarations | Done | registry + locale adapters |
| Locale-sensitive cache strategy | Partial | `buildProviderCacheKey` exposed in source test responses |
| Provider health | Done | tracker + circuit breaker |
| Timeout and retry policies | Done | `withTimeout` / `withRetry` |
| TMDB adapter | Done | ping, getMovie, searchMovies (injectable fetch) |
| Artwork adapters | Stub | Fanart / RPDB credential ping stubs |
| Rating adapters | Stub | IMDb unsupported stub |
| Provider diagnostics | Done | `GET/POST /api/v1/sources` + Sources UI test action |

## Exit criterion (AGENTS.md §37 Phase C)

> core is provider-neutral.

Satisfied for the packages layer: core code depends on `ProviderAdapter` / locale contracts, not TMDB HTTP details.
Runtime catalog/meta routes still use the legacy addon until later phases swap them over.

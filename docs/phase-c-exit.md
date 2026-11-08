# Phase C exit checklist (Provider framework)

Status: **core complete** — provider framework core is in place (adapters, locale, cache, diagnostics).
Redis shared cache remains deferred for MetaLayer Server.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Provider interfaces | Done | `ProviderAdapter`, `ProviderContext`, errors |
| Capability registry | Done | existing `PROVIDER_REGISTRY` |
| Provider locale adapters | Done | TMDB, language-only, unsupported |
| Localized capability declarations | Done | registry + locale adapters |
| Locale-sensitive cache strategy | Done | `@metalayer/cache` + TMDB/IMDb adapter cache keys |
| Provider health | Done | tracker + circuit breaker |
| Timeout and retry policies | Done | `withTimeout` / `withRetry` |
| TMDB adapter | Done | ping, getMovie, searchMovies, public id resolution |
| Artwork adapters | Done | Fanart movie artwork + RPDB poster URL builder/ping |
| Rating adapters | Done | IMDb via Cinemeta (`getRating`) |
| Provider diagnostics | Done | `/sources`, `/preview/movie/:id`, `/preview/rating/:id`, `/cache/stats` |
| Redis shared cache | Deferred | Lite uses in-process `MemoryCache` |

## Exit criterion (AGENTS.md §37 Phase C)

> core is provider-neutral.

Satisfied for the packages layer: core code depends on `ProviderAdapter` / locale contracts, not TMDB HTTP details.
Runtime catalog/meta routes still use the legacy addon until later phases swap them over.

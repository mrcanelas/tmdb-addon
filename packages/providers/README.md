# @metalayer/providers

Provider capability registry, runtime policies, locale adapters, and concrete adapters.

## Layout

```text
src/
  types.ts / registry.ts     # capability declarations (Sources UI)
  core/                      # errors, health, timeout/retry, cache keys
  locale/                    # ProviderLocaleAdapter implementations
  tmdb/                      # TMDB metadata adapter (Phase C)
  artwork/ / ratings/        # stubs until full fetchers land
```

Core MetaLayer packages must depend on the shared contracts (`ProviderAdapter`,
`ProviderLocaleAdapter`, `ProviderHttpPolicy`) — not on provider HTTP details.

## Runtime guarantees

- Every provider declares capabilities.
- Locale conversion is adapter-specific (`tmdbLocaleAdapter`, `languageOnlyLocaleAdapter`, …).
- Locale/region values that affect output belong in cache keys (`buildProviderCacheKey`).
- Timeouts, bounded retries, and a simple circuit breaker are shared.
- Secrets never appear in cache keys or public provider views.

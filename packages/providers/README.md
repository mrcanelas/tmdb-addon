# @metalayer/providers

Provider capability registry, runtime policies, locale adapters, and concrete adapters.

## Layout

```text
src/
  types.ts / registry.ts     # capability declarations (Sources UI)
  core/                      # errors, health, timeout/retry, cache keys
  locale/                    # ProviderLocaleAdapter implementations
  tmdb/                      # TMDB metadata adapter (Phase C)
  artwork/                   # Fanart + rated-poster hosts (RPDB, Top Posters, AIORatings, OpenPosterDB)
  ratings/                   # rating stubs until fetchers land
```

Core MetaLayer packages must depend on the shared contracts (`ProviderAdapter`,
`ProviderLocaleAdapter`, `ProviderHttpPolicy`) — not on provider HTTP details.

## Runtime guarantees

- Every provider declares capabilities.
- Locale conversion is adapter-specific (`tmdbLocaleAdapter`, `languageOnlyLocaleAdapter`, …).
- Locale/region values that affect output belong in cache keys (`buildProviderCacheKey`).
- Timeouts, bounded retries, and a simple circuit breaker are shared.
- Secrets never appear in cache keys or public provider views.

## TMDB adapter

```ts
import { TmdbProviderAdapter } from '@metalayer/providers';

const tmdb = new TmdbProviderAdapter({ apiKey: process.env.TMDB_API });
await tmdb.ping({ correlationId: '…', locale: 'pt-BR', region: 'BR' });
const movie = await tmdb.getMovie({ correlationId: '…', locale: 'pt-BR' }, 550);
```

## Artwork adapters

```ts
import {
  FanartArtworkAdapter,
  RpdbArtworkAdapter,
  TopPostersArtworkAdapter,
  AioRatingsArtworkAdapter,
  OpenPosterDbArtworkAdapter,
  buildRatedPosterUrl,
  RATED_POSTER_PROFILES,
} from '@metalayer/providers';

const fanart = new FanartArtworkAdapter({ apiKey: process.env.FANART_API });
const art = await fanart.getMovieArtwork({ correlationId: '…', locale: 'pt-BR' }, 550);

const rpdb = new RpdbArtworkAdapter({ apiKey: process.env.RPDB_API });
const posters = rpdb.getMovieArtwork({ correlationId: '…', locale: 'pt-BR' }, 550);

// Shared RPDB-compatible URL builder (also used by AIORatings / OpenPosterDB / Top Posters)
const url = buildRatedPosterUrl({
  profile: RATED_POSTER_PROFILES.aioratings,
  apiKey: '…',
  mediaType: 'movie',
  tmdbId: 550,
});
```

Rated-poster hosts embed the provider key in the image URL by design of those services;
MetaLayer should prefer a server-side image proxy before exposing them in public Stremio responses.

HTTP is injectable for tests (`fetchImpl`). Live smoke calls stay out of default CI.

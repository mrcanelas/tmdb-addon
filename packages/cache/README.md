# @metalayer/cache

In-process, locale-sensitive cache for MetaLayer provider and resolved responses.

## Guarantees

- Cache keys must include locale/region/fallback fragments that affect output.
- Secrets must never appear in keys.
- Degraded payloads get a short TTL and do not poison long-lived slots.
- Optional stale-while-revalidate via `staleEligible`.

## Usage

```ts
import { MemoryCache, cachedLoad } from '@metalayer/cache';

const cache = new MemoryCache();
const { value, cacheStatus, key } = await cachedLoad({
  cache,
  providerId: 'tmdb',
  operation: 'movie',
  identity: '550',
  ctx: { correlationId: '…', locale: 'pt-BR', region: 'BR' },
  fallbackChain: ['pt-BR', 'en-US'],
  load: () => tmdb.getMovie(ctx, 550),
});
```

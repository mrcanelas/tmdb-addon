# Anime

Anime is a first-class MetaLayer media type (`movie` | `series` | `anime`), not a special genre of series.

Package: `@metalayer/anime`. Catalog Studio seeds and previews include anime providers. Phase H exit: `docs/phase-h-exit.md`. Tracking: `docs/tracking.md`. Identity: `docs/identity-graph.md`.

## Providers

| Provider | Transport | Notes |
|---|---|---|
| AniList | GraphQL (`https://graphql.anilist.co`) | Public catalog/meta; OAuth for tracking |
| MyAnimeList | Jikan REST | Set `METALAYER_JIKAN_URL` for self-hosted Jikan |
| Kitsu | JSON:API | Thin catalog + metadata |
| Fribb | Fixture by default; live optional | Cross-id edges for Identity Graph. Set `METALAYER_FRIBB_LIVE=true` (and optional `METALAYER_FRIBB_URL`) for live fetch with SSRF host allowlist; CI keeps the fixture |
| TMDB / TVDB | Shared adapters | Used when configured in Field Resolution / catalogs |

## Titles

Anime title preferences are independent of movie/series `titleMode`:

- native
- romaji
- english
- localized

See `@metalayer/anime` `pickAnimeTitle`.

## Numbering and episode order

`mapAbsoluteToCour` / `mapCourToAbsolute` map absolute episode indexes onto split-cour season sizes.

Native anime meta resolves `videos[]` through Field Resolution Chains on `episodeOrder` (`AGENTS.md` §10.11):

1. Compile the effective plan (`orderTypes` × providers) via `compileResolutionPlan`.
2. Fetch episodes with `getEpisodes` on AniList / MAL (Jikan) / Kitsu.
3. Build Stremio videos with `buildAnimeVideos` (`absolute` keeps season 1; `aired` uses Fribb season / cour sizes).
4. Prefer IMDb (`tt…:s:e`) or `tmdb:{id}:s:e` ids when Fribb/identity knows them; otherwise `{provider}:{id}:s:e`.
5. Apply episode corrections; emit cour/episode Identity Graph edges for Inspector.

Default anime order types: absolute → aired → provider-default. Edit the chain on `/configure/metas/fields` (order-type priority list). Meta Inspector returns `episodeOrder.attempts`.

## Native Stremio routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:configId/catalog/anime/:id.json` | Anime catalog page |
| GET | `/c/:configId/meta/anime/:id.json` | Anime metadata with resolved `videos[]` |
| GET | `/c/:configId/p/:profileId/catalog\|meta/anime/...` | Profile-scoped |

Empty results use `{ "metas": [] }` — never fake error cards.

## Tracking

`AnimeTrackingPort` and `@metalayer/tracking` define watch status shapes and hide-watched annotation. AniList and MAL OAuth browser flows are available in configure Tracking (`docs/tracking.md`).

## Identity

Anime resolves to Identity Graph `entityKind: 'work'` with MAL / AniList / Kitsu edges. Cour and episode edges (`buildCourEdges` / `buildEpisodeEdges`) attach when Fribb maps an entry onto a TMDB/IMDb season. Corrections may remap seasons/episodes without changing provider adapters (`docs/corrections.md`).

## Still follow-up

- Richer anime-only Appearance Studio controls (thumbnails, title preference UI polish)
- Deeper franchise / multi-cour graph UX beyond per-request edges
- DVD / production order when a provider exposes those lists

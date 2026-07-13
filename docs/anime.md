# Anime

Anime is a first-class MetaLayer media type (`movie` | `series` | `anime`), not a special genre of series.

Package: `@metalayer/anime`. Catalog Studio seeds and previews include anime providers. Phase H exit: `docs/phase-h-exit.md`. Tracking: `docs/tracking.md`. Identity: `docs/identity-graph.md`.

## Providers

| Provider | Transport | Notes |
|---|---|---|
| AniList | GraphQL (`https://graphql.anilist.co`) | Public catalog/meta; OAuth for tracking |
| MyAnimeList | Jikan REST | Set `METALAYER_JIKAN_URL` for self-hosted Jikan |
| Kitsu | JSON:API | Thin catalog + metadata |
| Fribb | Fixture dataset | Cross-id edges for CI / Identity Graph |
| TMDB / TVDB | Shared adapters | Used when configured in Field Resolution / catalogs |

## Titles

Anime title preferences are independent of movie/series `titleMode`:

- native
- romaji
- english
- localized

See `@metalayer/anime` `pickAnimeTitle`.

## Numbering

`mapAbsoluteToCour` / `mapCourToAbsolute` map absolute episode indexes onto split-cour season sizes. Episode-order Field Resolution Chains and richer Appearance UX remain Phase M follow-ups (`AGENTS.md` §10.11).

## Native Stremio routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:configId/catalog/anime/:id.json` | Anime catalog page |
| GET | `/c/:configId/meta/anime/:id.json` | Anime metadata (AniList-backed gather MVP) |
| GET | `/c/:configId/p/:profileId/catalog\|meta/anime/...` | Profile-scoped |

Empty results use `{ "metas": [] }` — never fake error cards.

## Tracking

`AnimeTrackingPort` and `@metalayer/tracking` define watch status shapes and hide-watched annotation. AniList and MAL OAuth browser flows are available in configure Tracking (`docs/tracking.md`).

## Identity

Anime resolves to Identity Graph `entityKind: 'work'` with MAL / AniList / Kitsu edges. Corrections may remap seasons/episodes without changing provider adapters (`docs/corrections.md`).

## Still follow-up

- Richer anime-only Appearance / episode-order Studio controls
- Live Fribb dataset fetch (fixtures remain for CI)
- Deeper franchise / cour graph UX

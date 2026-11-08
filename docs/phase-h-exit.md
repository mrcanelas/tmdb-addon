# Phase H exit checklist (Anime)

Status: **complete** — anime is a first-class supported type with dedicated providers, numbering helpers, Fribb fixtures, and catalog/identity wiring.

## Checklist

| Item | Status | Notes |
|---|---|---|
| AniList | Done | GraphQL adapter + catalog/meta/external ids |
| MAL / Jikan | Done | REST adapter + `METALAYER_JIKAN_URL` |
| Kitsu | Done | JSON:API thin adapter |
| Fribb | Done | Fixture rows → provider id bags (CI, no live download) |
| Anime catalogs | Done | Preview for anilist/mal/kitsu; seed “Trending Anime” |
| Anime identity | Done | `entityKind: work` + MAL/AniList/Kitsu edges |
| Split cours | Done | `mapAbsoluteToCour` / `mapCourToAbsolute` |
| Absolute numbering | Done | helpers in `@metalayer/anime` |
| Tracking foundations | Done | `AnimeTrackingPort` / watch status types (OAuth = Phase I) |

## Exit criterion (AGENTS.md §37 Phase H)

> anime is a first-class supported type.

Satisfied by:

- `mediaType: 'anime'` in config/catalogs/manifest
- live anime provider catalog preview (not only TMDB-as-TV)
- identity resolve for MAL/AniList as `metalayer:work:…`
- unit tests for formats, cours, adapters, and Fribb fixtures

## Out of scope (later)

- AniList/MAL OAuth tracking sync (Phase I)
- Live Fribb dataset fetch
- Full episode absolute-numbering UI / Correction Hub overlays
- Stremio `/meta` anime route end-to-end

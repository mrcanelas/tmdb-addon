# Anime

Anime is a first-class MetaLayer media type (`movie` | `series` | `anime`), not a special genre of series.

## Providers

| Provider | Transport | Notes |
|---|---|---|
| AniList | GraphQL (`https://graphql.anilist.co`) | No API key for public catalog/meta |
| MyAnimeList | Jikan REST | Set `METALAYER_JIKAN_URL` for self-hosted Jikan |
| Kitsu | JSON:API | Thin catalog + metadata |
| Fribb | Fixture dataset | Cross-id edges for CI / Identity Graph |

## Titles

Anime title preferences are independent of movie/series `titleMode`:

- native
- romaji
- english
- localized

See `@metalayer/anime` `pickAnimeTitle`.

## Numbering

`mapAbsoluteToCour` / `mapCourToAbsolute` map absolute episode indexes onto split-cour season sizes.

## Tracking

`AnimeTrackingPort` and `@metalayer/tracking` define watch status shapes and hide-watched annotation.

OAuth token vault kinds (`oauth_access` / `oauth_refresh`) and reconnection states are Phase I foundations. Full browser OAuth sync for AniList/MAL lands with the broader Tracking module.

## Identity

Anime resolves to Identity Graph `entityKind: 'work'` with MAL / AniList / Kitsu edges.

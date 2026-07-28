# Appearance

Appearance / presentation controls how metadata is **shown** in Stremio. Artwork and localized text **resolution** use Field Resolution Chains (`AGENTS.md` §10 / §15).

Canonical FRC index: `docs/field-resolution-chains.md`. Phase F exit: `docs/phase-f-exit.md`. Frontend targets: `FRONTEND.md`.

## Primary surface

| Surface | Role |
|---|---|
| `/configure/metas/fields?field=general` | **General** settings: language/region + presentation toggles |
| `/configure/metas/fields?field=poster` (etc.) | Field Resolution Chains for each metadata field |

Legacy `/configure/metas/appearance` and `?field=appearance` redirect to `?field=general`.

## Presentation preferences (`config.presentation`)

Typed block (not `featureFlags`):

| Field | Effect |
|---|---|
| `castCount` | Truncate cast on details (`0` / `5` / `10` / `15`; omit = unlimited) |
| `catalogNamePrefix` | Prefix catalog names in the native manifest with `MetaLayer - ` |
| `showAgeRatingInGenres` | Prepend certification to `genres` via `applyPresentation` once meta emits genres/certification |
| `hideEpisodeSpoilers` | Saved; blur proxy is a follow-up (SSRF-safe) |
| `ratingPostersForLibrary` | Saved; applies rated posters to Library/Continue Watching once public meta uses rated chains |

API: `GET/PUT /api/v1/configurations/:configId/presentation`.

Pure helper: `applyPresentation` in `@metalayer/metadata-resolver` (cast truncate + age-in-genres; deferred warnings for spoilers/library posters).

## Field chains

Artwork and title chains are edited per field on Metas → Fields. Defaults seed locales from `localization.metadataLocale` + `metadataFallbackLocales` (`ensureFieldPlan`). Artwork includes `no-language`.

Provider pickers honor instance availability (`AGENTS.md` §8.1.1).

## Still follow-up

- Wire `resolveMetadata` + `applyPresentation` into public `/c/:configId/meta` routes
- SSRF-safe episode thumbnail blur
- Rated posters on Library / Continue Watching surfaces
- Live Stremio-like previews beyond the Fields draft panel

# Profiles

Profiles create multiple metadata experiences under one configuration (locale, catalogs, rules, sorting, presentation, and tracking preference).

Configure UI: `/configure/profiles`. Canonical product rules: `AGENTS.md` §21. Schema ADR: `docs/adr/0009-profile-overrides.md`.

## Behavior

- Profiles live on `MetaLayerConfig.profiles` (`ProfileDefinition`).
- Persist via `GET/PUT /api/v1/configurations/:configId/profiles`.
- Install URL: `/c/:configId/p/:profileId/manifest.json`.
- Overrides (all optional):
  - partial `localization`
  - ordered `catalogInstanceIds`
  - `rules` (keys override `globalRules`)
  - `sorting` (replaces `globalSorting`)
  - `presentation` (merged onto config presentation)
  - `trackingProvider` (`trakt` | `simkl` | `anilist` | `mal`)
- Stremio resource paths under the same profile base:
  - `/c/:configId/p/:profileId/catalog/:type/:id.json`
  - `/c/:configId/p/:profileId/meta/:type/:id.json`
- Catalog/meta use the effective config from `applyProfileToConfig`. Window cache keys include `profileId`.

## Operator flow

1. Open `/configure/profiles` with edit credential.
2. Create a profile and edit tabs: General, Language & Region, Catalogs, Rules, Sorting, Appearance, Tracking.
3. Copy each profile manifest URL into Stremio.
4. Changing the parent configuration updates profile-scoped routes without reinstalling when `configId` / `profileId` stay stable.

## Management API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/configurations/:configId/profiles` | List profiles |
| PUT | `/api/v1/configurations/:configId/profiles` | Replace profile set |

Requires `X-MetaLayer-Edit-Credential`.

## Still follow-up

- Clone profile to another configuration
- Richer family onboarding presets
- Full Rule / Sorting Studio editors embedded in profile tabs

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

# Profiles

Profiles create multiple metadata experiences under one configuration (locale, catalogs, and related overrides).

Configure UI: `/configure/profiles`. Canonical product rules: `AGENTS.md` §21.

## MVP behavior

- Profiles live on `MetaLayerConfig.profiles` (`ProfileDefinition`).
- Persist via `GET/PUT /api/v1/configurations/:configId/profiles`.
- Install URL: `/c/:configId/p/:profileId/manifest.json`.
- Optional overrides: partial `localization`, ordered `catalogInstanceIds`.
- Stremio resource paths under the same profile base:
  - `/c/:configId/p/:profileId/catalog/:type/:id.json`
  - `/c/:configId/p/:profileId/meta/:type/:id.json`
- Catalog/meta use the effective config (filtered catalogs + merged localization).

## Operator flow

1. Open `/configure/profiles` with edit credential.
2. Create profiles (name + optional localization / catalog subset).
3. Copy each profile manifest URL into Stremio (or open from Save & Install when linked).
4. Changing the parent configuration updates profile-scoped routes without reinstalling when `configId` / `profileId` stay stable.

## Management API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/configurations/:configId/profiles` | List profiles |
| PUT | `/api/v1/configurations/:configId/profiles` | Replace profile set |

Requires `X-MetaLayer-Edit-Credential`.

## Still follow-up

- Per-profile rules / sorting / appearance / tracking overrides in UI
- Clone profile to another configuration
- Richer family onboarding presets

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

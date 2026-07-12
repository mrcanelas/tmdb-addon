# Profiles

Configure UI: `/configure/profiles`.

Canonical product rules: `AGENTS.md` §21.

## MVP behavior

- Profiles live on `MetaLayerConfig.profiles` (`ProfileDefinition`).
- Persist via `GET/PUT /api/v1/configurations/:configId/profiles`.
- Install URL: `/c/:configId/p/:profileId/manifest.json`.
- Optional overrides: partial `localization`, ordered `catalogInstanceIds`.
- Stremio resource paths under the same profile base:
  - `/c/:configId/p/:profileId/catalog/:type/:id.json`
  - `/c/:configId/p/:profileId/meta/:type/:id.json`
- Catalog/meta use the effective config (filtered catalogs + merged localization).

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

# Profiles

Configure UI: `/configure/profiles`.

Canonical product rules: `AGENTS.md` §21.

## MVP behavior

- Profiles live on `MetaLayerConfig.profiles` (`ProfileDefinition`).
- Persist via `GET/PUT /api/v1/configurations/:configId/profiles`.
- Install URL: `/c/:configId/p/:profileId/manifest.json`.
- Optional overrides: partial `localization`, ordered `catalogInstanceIds`.
- Catalog/meta under `/c/.../p/...` remain a follow-up; profile install currently reuses base catalog/meta routes until profile-scoped serving lands.

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

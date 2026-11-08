# Public routes (MetaLayer)

Base URL example: `http://localhost:1338` (`METALAYER_API_PORT`).

All Stremio and management routes are served by `apps/server`. The Express TMDB Addon process (port 1337) is archived on branch `legacy/tmdb-addon-3.1.7`.

## Native MetaLayer Stremio routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:configId/manifest.json` | Native manifest (identity `community.metalayer`; no secrets in URL) |
| GET | `/c/:configId/catalog/:type/:id.json` | Native catalog (`{ metas: [] }` when unknown) |
| GET | `/c/:configId/catalog/:type/:id/:extra.json` | Native catalog with `skip=` pagination |
| GET | `/c/:configId/meta/:type/:id.json` | Native meta (movie/series via TMDB; anime via AniList) |
| GET | `/c/:configId/p/:profileId/manifest.json` | Profile-scoped native manifest |
| GET | `/c/:configId/p/:profileId/catalog/:type/:id.json` | Profile-scoped catalog |
| GET | `/c/:configId/p/:profileId/catalog/:type/:id/:extra.json` | Profile-scoped catalog with `skip=` |
| GET | `/c/:configId/p/:profileId/meta/:type/:id.json` | Profile-scoped meta |

Profile Stremio paths are documented in `docs/profiles.md`.

## Legacy URL compatibility (same server)

Compressed TMDB Addon installs keep working through these paths. Manifest identity is **`tmdb-addon` / `3.1.7`**. Secrets in the URL segment are request-scoped only (not persisted). Prefer `import-legacy` for native configs.

| Method | Path | Purpose |
|---|---|---|
| GET | `/manifest.json` | Default legacy-identity manifest |
| GET | `/:catalogChoices/manifest.json` | Manifest for compressed / language-only config |
| GET | `/catalog/:type/:id/:extra?.json` | Catalog without blob |
| GET | `/:catalogChoices/catalog/:type/:id/:extra?.json` | Catalog with config blob |
| GET | `/meta/:type/:id.json` | Metadata without blob |
| GET | `/:catalogChoices/meta/:type/:id.json` | Metadata with config blob |

`catalogChoices` may be an lz-string compressed JSON configuration or a language tag (e.g. `pt-BR`). Unsupported catalog providers (MDBList, Trakt lists, streaming ids without adapters) return `{ "metas": [] }`.

Reserved first segments (`c`, `api`, `configure`, `admin`, …) are never treated as `catalogChoices`.

## Configuration UI

| Method | Path | Purpose |
|---|---|---|
| GET | `/configure`, `/configure/*` | MetaLayer Configure SPA (`apps/frontend`) |
| GET | `/admin`, `/admin/*` | MetaLayer Admin SPA (`apps/dashboard`) |

## Management API (selected)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/configurations` | Create persistent configuration |
| POST | `/api/v1/configurations/import-legacy` | Import TMDB Addon config (`dryRun` supported) |
| GET | `/api/v1/configurations/:configId` | Read config (edit credential header) |
| PUT | `/api/v1/configurations/:configId` | Update config (creates revision) |
| GET | `/api/v1/configurations/:configId/revisions` | List revisions |
| GET | `/api/v1/configurations/:configId/revisions/:revisionId` | Read revision snapshot |
| POST | `/api/v1/configurations/:configId/revisions/:revisionId/restore` | Restore revision |
| GET | `/api/v1/configurations/:configId/export` | Safe export (secret states only) |
| GET | `/api/v1/sources` | Provider capability registry + health snapshots |
| GET | `/api/v1/sources/:providerId` | Provider details + locale example |
| POST | `/api/v1/sources/:providerId/test` | Ping provider (body apiKey, env, or vault) |
| GET | `/api/v1/preview/movie/:id` | Cached movie preview (`tt…`, `tmdb:`, or bare TMDB id) |
| GET | `/api/v1/preview/rating/:imdbId` | Cached IMDb/Cinemeta metadata preview |
| GET | `/api/v1/cache/stats` | In-process provider cache stats |
| GET | `/api/v1/configurations/:configId/localization` | Read localization preferences |
| PUT | `/api/v1/configurations/:configId/localization` | Update localization preferences |
| GET | `/api/v1/configurations/:configId/identity` | Read identity preferences + feature flags |
| PUT | `/api/v1/configurations/:configId/identity` | Update `stremioPublicId` preference (ADR 0006) |
| GET | `/api/v1/health` | Health |

## Compatibility rules

- Empty catalogs must return `{ "metas": [] }` — never fake media cards as errors.
- Only advertise Stremio resources that are actually enabled.
- Do not remove legacy-identity URL support before a stable MetaLayer release and documented support window (`AGENTS.md` §6.5, `docs/deprecations.md`).
- The archived Express app on `legacy/tmdb-addon-3.1.7` is not part of this branch.

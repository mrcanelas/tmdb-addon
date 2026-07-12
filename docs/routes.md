# Current public routes (legacy TMDB Addon)

This document records the routes that must remain compatible during the MetaLayer migration.
Native MetaLayer routes (`/c/:configId/...`) are planned and must not replace these until migration tooling and a documented support window exist.

Base URL example: `http://localhost:1337`

## Stremio protocol (public contracts)

| Method | Path | Purpose |
|---|---|---|
| GET | `/manifest.json` | Default manifest |
| GET | `/:catalogChoices/manifest.json` | Manifest for compressed config |
| GET | `/catalog/:type/:id/:extra?.json` | Catalog |
| GET | `/:catalogChoices/catalog/:type/:id/:extra?.json` | Catalog with config |
| GET | `/meta/:type/:id.json` | Metadata |
| GET | `/:catalogChoices/meta/:type/:id.json` | Metadata with config |

`catalogChoices` is an lz-string compressed JSON configuration (legacy). Secrets may still appear in this segment today; MetaLayer persistent configs must move secrets to the Secret Vault.

## Configuration UI

| Method | Path | Purpose |
|---|---|---|
| GET | `/` and SPA routes | Configure UI (`dist/`) |
| GET | static assets under `/public` | Logos, favicon, background |

## Auth / integration helpers (non-Stremio)

Documented in `docs/api.md`, including TMDB session helpers and Trakt OAuth callbacks.

## Native MetaLayer routes (Phase B+ / beta)

Implemented by `apps/server` (port `1338` by default):

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:configId/manifest.json` | Native manifest (no secrets in URL) |
| GET | `/c/:configId/catalog/:type/:id.json` | Native catalog (empty `{ metas: [] }` when unknown) |
| GET | `/c/:configId/catalog/:type/:id/:extra.json` | Native catalog with `skip=` pagination |
| GET | `/c/:configId/meta/:type/:id.json` | Native meta (movie/series via TMDB; anime via AniList) |
| GET | `/c/:configId/p/:profileId/manifest.json` | Profile-scoped native manifest |
| GET | `/c/:configId/p/:profileId/catalog/:type/:id.json` | Profile-scoped catalog |
| GET | `/c/:configId/p/:profileId/catalog/:type/:id/:extra.json` | Profile-scoped catalog with `skip=` |
| GET | `/c/:configId/p/:profileId/meta/:type/:id.json` | Profile-scoped meta |
| POST | `/api/v1/configurations` | Create persistent configuration |
| POST | `/api/v1/configurations/import-legacy` | Import TMDB Addon config (`dryRun` supported) |
| GET | `/api/v1/configurations/:configId` | Read config (edit credential header) |
| PUT | `/api/v1/configurations/:configId` | Update config (creates revision) |
| GET | `/api/v1/configurations/:configId/revisions` | List revisions |
| GET | `/api/v1/configurations/:configId/revisions/:revisionId` | Read revision snapshot |
| POST | `/api/v1/configurations/:configId/revisions/:revisionId/restore` | Restore revision |
| GET | `/api/v1/configurations/:configId/export` | Safe export (secret states only) |
| GET | `/api/v1/sources` | Provider capability registry |
| GET | `/api/v1/sources/:providerId` | Provider details + locale example |
| POST | `/api/v1/sources/:providerId/test` | Ping provider (body apiKey, env, or vault) |
| GET | `/api/v1/preview/movie/:id` | Cached movie preview (`tt…`, `tmdb:`, or bare TMDB id) |
| GET | `/api/v1/preview/rating/:imdbId` | Cached IMDb rating preview via Cinemeta |
| GET | `/api/v1/cache/stats` | In-process provider cache stats |

Profile Stremio paths are documented in `docs/profiles.md`.

## Compatibility rules

- Do not remove legacy routes before a stable MetaLayer release and documented support window.
- Empty catalogs must return `{ "metas": [] }` — never fake media cards as errors.
- Only advertise Stremio resources that are actually enabled.

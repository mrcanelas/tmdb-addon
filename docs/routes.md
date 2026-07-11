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

## Planned MetaLayer routes (not implemented yet)

```text
/c/:configId/manifest.json
/c/:configId/catalog/:type/:id/:extra?.json
/c/:configId/meta/:type/:id.json
/c/:configId/p/:profileId/manifest.json
/api/v1/configurations
```

## Compatibility rules

- Do not remove legacy routes before a stable MetaLayer release and documented support window.
- Empty catalogs must return `{ "metas": [] }` — never fake media cards as errors.
- Only advertise Stremio resources that are actually enabled.

# Phase D exit checklist (Catalog Studio)

Status: **complete** — ordering, studio ops, merge/rotation, tags/groups, result preview, and catalog def import/export are in place.

Native Stremio `/c/:configId/catalog/...` result serving remains a follow-up (manifest now lists studio catalogs; live page fetch is available via Studio preview).

## Checklist

| Item | Status | Notes |
|---|---|---|
| Unified catalog ordering (movie/series/anime) | Done | `@metalayer/catalogs` |
| Catalog instances (not provider IDs as UI ids) | Done | `instanceId` |
| Rename / duplicate / enable / Home / reorder / delete | Done | studio helpers + API |
| Tags / groups | Done | schema + API `setTags`/`setGroup` + UI |
| Merged catalogs | Done | `append` / `interleave` / `dedupe-union` / `weighted-mix` / `priority-fallback` |
| Rotations | Done | `hourly` / `daily` / `weekly` stable windows |
| Preview of catalog results | Done | `POST .../catalogs/:id/preview` via TMDB `getCatalogPage` |
| Imports / exports of catalog defs | Done | `GET .../export` + `POST .../catalogs` import |
| Catalog Studio UI | Done | `apps/frontend` `/catalog-studio` |
| Native manifest catalogs | Done | `toManifestCatalogEntries` on `/c/:configId/manifest.json` |

## Exit criterion (AGENTS.md §37 Phase D)

> catalog UI order equals manifest order.

Satisfied: studio list, API `manifestOrder`, and native manifest catalogs share one ordered `CatalogDefinition[]`.

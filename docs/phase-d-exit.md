# Phase D exit checklist (Catalog Studio)

Status: **core started** — unified ordering, studio operations, API, and minimal UI.

Merged catalogs, rotations, tags/groups UI depth, and catalog import/export remain for follow-up.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Unified catalog ordering (movie/series/anime) | Done | `@metalayer/catalogs` `sortCatalogsByPosition` / `toManifestCatalogEntries` |
| Catalog instances (not provider IDs as UI ids) | Done | `instanceId` on `CatalogDefinition` |
| Rename / duplicate / enable / Home / reorder | Done | studio helpers + `/api/v1/configurations/:id/catalogs` |
| Catalog Studio UI | Done (minimal) | `apps/configure` `/catalog-studio` with studio vs manifest preview |
| Preview of catalog *results* | Deferred | needs catalog fetch pipeline (later) |
| Tags / groups | Partial | schema `tags` + optional `group`; UI later |
| Merged catalogs | Deferred | Phase D follow-up |
| Rotations | Deferred | Phase D follow-up |
| Imports / exports of catalog defs | Deferred | Phase D follow-up |

## Exit criterion (AGENTS.md §37 Phase D)

> catalog UI order equals manifest order.

Satisfied for the studio surface: both lists are derived from the same ordered `CatalogDefinition[]`, and API tests assert move keeps `manifestOrder` types in sync with studio positions.

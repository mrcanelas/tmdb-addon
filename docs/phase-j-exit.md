# Phase J exit checklist (Correction Hub)

Status: **complete** — correction schema, local overrides, community files, episode mapping, alternative orders, moderation, and Correction UI.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Correction schema | Done | `MetadataCorrection` + `validateCorrection` |
| Local overrides | Done | `CorrectionRegistry.upsertLocal` / delete rollback |
| Community files | Done | Sample catalog + `GET /api/v1/corrections` |
| Episode mapping | Done | `remapEpisode` (reassignment / absolute / dvd / broadcast) |
| Alternative orders | Done | `dvd_order`, `broadcast_order`, `alternative_numbering` |
| Moderation | Done | propose / verify / reject / deprecate / supersede |
| Correction UI | Done | `/corrections` with list, add, preview, rollback |
| Independent of providers | Done | Package `@metalayer/corrections` has no provider adapters |

## Exit criterion (AGENTS.md §37 Phase J)

> corrections are independent of provider code.

Satisfied: apply/remap/precedence live in `@metalayer/corrections`; identity bridge produces stubs for `@metalayer/identity-graph` without importing provider packages.

## Out of scope (later)

- Persistent SQLite storage for local corrections (in-memory registry for alpha)
- Public community contribution workflow / moderation queue UI
- Full Meta Inspector overlay listing for every corrected field

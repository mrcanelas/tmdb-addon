# Phase G exit checklist (Identity Graph)

Status: **complete** — canonical IDs, provider edges, confidence/precedence, evidence, cache, and diagnostics are observable and testable.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Canonical IDs | Done | `metalayer:{entity}:{suffix}` via `createCanonicalId` |
| Provider edges | Done | `buildEdgesFromProviderIds` (bidirectional, method `provider`) |
| Confidence | Done | per-edge confidence + `precedenceScore` |
| Evidence | Done | `IdentityEvidence` on every edge |
| Cache | Done | `IdentityMappingCache` over `@metalayer/cache` |
| Graph diagnostics | Done | `buildIdentityDiagnostics` + API + Inspector UI |
| Mapping precedence | Done | verified/manual/provider/heuristic ordering (§18.6 stub for Phase J) |

## Exit criterion (AGENTS.md §37 Phase G)

> cross-provider mappings are observable and testable.

Satisfied by `@metalayer/identity-graph` unit tests and:

- `POST /api/v1/configurations/:id/identity/resolve`
- `POST /api/v1/configurations/:id/identity/diagnostics`
- Meta Inspector response includes `identity.diagnostics`

## Out of scope (later)

- Persisted graph store / community datasets
- Full TVDB/AniList/MAL edge ingestion (Phase H)
- Correction Hub overlay (Phase J)
- Anime split-cours / franchise entities beyond basic kinds

# Identity Graph

Identity Graph maps works (and related entities) across providers with confidence, evidence, and explicit precedence. It is more than a single ID-conversion helper.

Package: `@metalayer/identity-graph`. Configure: Advanced (Stremio public-ID preference) + Meta Inspector identity tab. Phase G exit: `docs/phase-g-exit.md`.

Canonical entities, edges, and precedence: `AGENTS.md` §18. Corrections that override mappings: `docs/corrections.md`.

## Precedence (high → low)

1. Verified local correction
2. Verified community correction
3. Official provider cross-ID
4. Trusted external dataset
5. Exact deterministic match
6. Heuristic match
7. Unresolved

Low-confidence edges must not silently override verified mappings. Diagnostics expose confidence and method.

Diagnostic `warnings` use **stable codes** (`INCOMPLETE_GRAPH`, `LOW_CONFIDENCE_EDGE`, `UNRESOLVED_PROVIDERS`) plus optional `params`. Meta Inspector translates them via `inspector.identityWarning.*`.

## Operator flow

1. Set Stremio public-ID preference under `/configure/advanced` (`GET/PUT .../identity`).
2. Resolve a title via Meta Inspector or `POST .../identity/resolve` (provider ids and/or public id).
3. Inspect matches, confidence, and evidence (`POST .../identity/diagnostics`).
4. Apply local corrections when automatic mapping is wrong (`docs/corrections.md`).

## Management API

All routes require `X-MetaLayer-Edit-Credential` unless noted. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/identity` | Identity preferences (`stremioPublicId`, …) |
| PUT | `/configurations/:configId/identity` | Persist preferences |
| POST | `/configurations/:configId/identity/resolve` | Resolve mapping (+ cache status) |
| POST | `/configurations/:configId/identity/diagnostics` | Diagnostics for supplied ids |

Inspect payloads also include identity matches for Meta Inspector (`docs/phase-f-exit.md`).

## Still follow-up

- Richer franchise / cour / edition graph UX
- Operator moderation tools beyond Correction Hub
- Shared Redis-backed identity cache for multi-instance Server mode

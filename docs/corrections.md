# Corrections

MetaLayer Correction Hub (`@metalayer/corrections`) resolves metadata and identity problems that automatic provider mapping cannot solve.

## Precedence

1. Local overrides
2. Verified community corrections
3. Provider / dataset / heuristic edges

When the same `target + type` exists in both scopes, **local wins**.

## Safety

Corrections must not include stream URLs or copyrighted media links. Validation returns `CORRECTION_FORBIDDEN_CONTENT`.

## Management API

- `GET /api/v1/corrections` — community catalog
- `GET /api/v1/configurations/:configId/corrections`
- `POST /api/v1/configurations/:configId/corrections`
- `PATCH /api/v1/configurations/:configId/corrections/:id` — moderation
- `DELETE /api/v1/configurations/:configId/corrections/:id` — rollback local
- `POST /api/v1/configurations/:configId/corrections/preview`

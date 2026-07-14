# Corrections

MetaLayer Correction Hub (`@metalayer/corrections`) resolves metadata and identity problems that automatic provider mapping cannot solve.

Configure UI: `/configure/review/corrections` (hub: `/configure/review`). Canonical types and states: `AGENTS.md` §19. Phase J exit: `docs/phase-j-exit.md`. Identity precedence: `docs/identity-graph.md`.

## Precedence

1. Local overrides
2. Verified community corrections
3. Provider / dataset / heuristic edges

When the same `target + type` exists in both scopes, **local wins**.

## Safety

Corrections must not include stream URLs or copyrighted media links. Validation returns `CORRECTION_FORBIDDEN_CONTENT`.

## Operator flow

1. Open `/configure/review/corrections` with edit credential.
2. Browse community catalog and local overrides for the configuration.
3. Create a local correction (target identity + type + payload + reason).
4. Preview impact for a target before relying on it in meta routes.
5. Moderate status (`verified` / `rejected` / …) or delete a local override to roll back.

Native series meta can apply episode reassignment / specials corrections (MVP).

## Management API

Base path: `/api/v1`. Configuration routes require `X-MetaLayer-Edit-Credential`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/corrections` | Community catalog (public list shape) |
| GET | `/configurations/:configId/corrections` | Local + relevant community for config |
| POST | `/configurations/:configId/corrections` | Create local correction |
| PATCH | `/configurations/:configId/corrections/:id` | Moderation / status update |
| DELETE | `/configurations/:configId/corrections/:id` | Rollback local |
| POST | `/configurations/:configId/corrections/preview` | Preview for a target |

## Still follow-up

- Richer evidence UI and affected profile/catalog summaries
- Broader correction types wired end-to-end on every native meta path
- Community contribution packaging workflow beyond schema validation

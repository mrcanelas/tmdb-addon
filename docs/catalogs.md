# Catalogs

Catalog Studio manages movie, series, and anime catalogs in one ordered workspace. Manifest catalog order must match Studio order.

Package: `@metalayer/catalogs`. Configure UI: `/configure/catalogs`.

Canonical model, merge modes, and rotation: `AGENTS.md` §12. Phase D exit: `docs/phase-d-exit.md`. Public Stremio routes: `docs/routes.md`.

## Studio invariants (beta)

- Each catalog row is an **instance** (`instanceId`), not the raw provider catalog id — the same provider catalog may appear more than once.
- Movie, series, and anime share one position list unless a profile overrides catalogs.
- `GET .../catalogs` returns both `catalogs` (definitions) and `manifestOrder` (what Stremio will advertise).
- Empty catalog results use `{ "metas": [] }` — never fake error cards.

## Operator flow

1. Open `/configure/catalogs` with a persistent configuration and edit credential.
2. Reorder, rename, enable/disable, show/hide on Home, tag, duplicate, or delete instances.
3. Create **merged** or **rotated** catalogs from existing instance IDs when needed.
4. Use **Preview** on an instance to inspect provider pages, rules/sorting effects, and warnings.
5. Export/import catalog definitions for backup or transfer (secrets stay out of catalog payloads).
6. Install via Save & Install — native route `/c/:configId/catalog/:type/:id.json` (and profile-scoped `/c/.../p/:profileId/...`).

## Management API

All routes require a valid edit credential (`X-MetaLayer-Edit-Credential`). Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/catalogs` | Ordered definitions + `manifestOrder` (`?locale=` optional) |
| GET | `/configurations/:configId/catalogs/export` | Export catalog definitions |
| POST | `/configurations/:configId/catalogs` | Import (`catalogs` + mode) or `createMerged` / `createRotated` |
| POST | `/configurations/:configId/catalogs/:instanceId` | Rename, enable, Home, tags, group, move, duplicate, delete (`action`) |
| POST | `/configurations/:configId/catalogs/:instanceId/preview` | Page preview for Studio |

## Native Stremio routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/c/:configId/catalog/:type/:id.json` | Catalog page for installed addon |
| GET | `/c/:configId/catalog/:type/:id/:extra.json` | Same with `skip=` pagination |
| GET | `/c/:configId/p/:profileId/catalog/...` | Profile-scoped catalog |

Unknown or disabled catalogs return an empty `metas` array.

## Still follow-up

- Richer localized catalog display-name editing end-to-end in UI
- Broader provider preview coverage beyond current adapters
- AI-generated / ranked-list save flows (see Search & AI docs)

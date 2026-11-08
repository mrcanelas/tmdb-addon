# Sorting

Sorting Studio builds multi-step sorting plans with optional stable randomization windows. Home, full catalog, search, and recommendations may eventually use independent plans; beta configure edits the **global** plan.

Package: `@metalayer/sorting`. Configure UI: `/configure/sorting`.

Canonical criteria and context-specific sorting: `AGENTS.md` §14. Phase E exit: `docs/phase-e-exit.md`.

## Criteria available in beta configure

| Field | Notes |
|---|---|
| `sourceOrder` | Preserve upstream list order |
| `title` | Locale-aware title string |
| `rating` | Numeric rating |
| `voteCount` | Vote / popularity weight |
| `releaseDate` | Theatrical / aired date |
| `popularity` | Provider popularity score |
| `random` | Uses `randomSeedWindow` when `stable` |

Plan flags:

- `stable` — deterministic ties and seeded random
- `randomSeedWindow` — `request` \| `hour` \| `day` \| `week`

Catalog overrides may set `CatalogDefinition.sorting`; preview prefers catalog plan when `catalogInstanceId` is supplied.

## Operator flow

1. Open `/configure/sorting` with edit credential.
2. Load the stored global plan (`GET .../sorting`) — falls back to Studio defaults when unset.
3. Add/reorder criteria, set direction and stability.
4. **Preview** sample items to see resolved order and active seed window.
   Sample labels are localized via `sorting.sample.*` (ids remain stable).
5. Save with `PUT .../sorting`.

## Management API

All routes require `X-MetaLayer-Edit-Credential`. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/sorting` | Stored `globalSorting` (or `null`) |
| POST | `/configurations/:configId/sorting/preview` | Apply plan to sample items |
| PUT | `/configurations/:configId/sorting` | Persist or clear (`null`) global plan |

## Still follow-up

- Independent Home / full-catalog / search / recommendations plans in UI
- Additional criteria (digital release, watched status, custom score)
- Load/save catalog-scoped sorting from Catalog Studio

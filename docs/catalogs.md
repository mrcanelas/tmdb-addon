# Catalogs

Catalog Studio manages movie, series, and anime catalogs in one ordered workspace. Manifest catalog order must match Studio order.

Package: `@metalayer/catalogs`. Configure UI: `/configure/catalogs/studio` (hub: `/configure/catalogs`).

Canonical model, merge modes, and rotation: `AGENTS.md` §12. Phase D exit: `docs/phase-d-exit.md`. Public Stremio routes: `docs/routes.md`.

## Studio invariants (beta)

- Each catalog row is an **instance** (`instanceId`), not the raw provider catalog id — the same provider catalog may appear more than once.
- Movie, series, and anime share one position list unless a profile overrides catalogs.
- `GET .../catalogs` returns both `catalogs` (definitions) and `manifestOrder` (what Stremio will advertise).
- Catalog display names use `LocalizedText` (`name.default` + `name.values`). Studio + `manifestOrder` resolve via `resolveCatalogDisplayName(locale)` with base-language fallback (e.g. `pt-PT` → `pt-BR` values when only `pt-BR` exists).
- Empty catalog results use `{ "metas": [] }` — never fake error cards.

## Operator flow

1. Open `/configure/catalogs/studio` with a persistent configuration and edit credential.
2. Reorder, rename, enable/disable, show/hide on Home, tag, duplicate, or delete instances.
   Duplicate accepts a localized `copySuffix` (configure sends `catalogs.copySuffix`) and optional `locale` for the base display name.
3. Create **merged** or **rotated** catalogs from existing instance IDs when needed.
4. Use **Preview** on an instance to inspect provider pages, rules/sorting effects, and warnings.
   Preview warnings use **stable codes** (`INSTANCE_NOT_FOUND`, `ROTATION_ACTIVE`, `MERGE_SOURCE_NOT_FOUND`, …). The configure UI translates them via `catalogs.warning.*`.
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
| GET | `/c/:configId/catalog/:type/:id/:extra.json` | Same with `skip=` pagination (`extra` also carries `search=` / `genre=`) |
| GET | `/c/:configId/catalog/:type/metalayer.search/search=...json` | Native text search (see `docs/search-ai.md`) |
| GET | `/c/:configId/p/:profileId/catalog/...` | Profile-scoped catalog |

Unknown or disabled catalogs return an empty `metas` array.

## Account, list and AI catalogs

Account-backed catalogs are delivered live from the connected account (AGENTS.md §8.2, §20).
The user credential comes from the per-configuration Secret Vault (`oauth_access` for OAuth
providers, `api_key` for MDBList, `tmdb_session` for TMDB account lists) and travels only in
request headers / provider-defined parameters — never in Stremio URLs, cache keys or logs.

| Provider | `providerCatalogId` | Credential | Notes |
|---|---|---|---|
| Trakt | `watchlist`, `recommendations`, `list.{slug}` | OAuth token | List order preserved (`facts.listPosition`) |
| Trakt | `trending`, `popular` | instance client id only | Public catalogs, no user token |
| MDBList | `{listId}` (legacy), `list.{listId}`, `list.{user}/{slug}` | user API key | Movies and shows buckets |
| TMDB account | `account.watchlist`, `account.favorites`, `account.list.{id}` | `tmdb_session` + TMDB key | Never cached (personal) |
| SIMKL | `watchlist` (plan to watch), `watching`, `completed`, `hold`, `dropped` | OAuth token | Movies, series and anime |
| AniList | `user.{current\|planning\|completed\|paused\|dropped\|repeating}` | OAuth token | Anime only |
| MyAnimeList | `user.{watching\|completed\|on_hold\|dropped\|plan_to_watch}` | OAuth token | Anime only |
| MetaLayer | `ai.ranked-list` | none | Served from `staticItems` stored at proposal confirmation |

When the credential is missing or rejected the catalog returns `{"metas": []}` plus a
`SOURCE_CREDENTIAL_MISSING` / `SOURCE_CREDENTIAL_INVALID` warning. Degraded responses are not
written to the shared catalog window cache, so connecting an account takes effect immediately.

### Studio source picker (§8.1.1)

`GET /api/v1/configurations/:configId/catalog-sources` lists, per account provider, whether it is
enabled on the instance, whether the configuration has a credential, and which catalogs can be
added (including personal lists fetched live). `POST .../catalog-sources/import` appends the
selected catalogs. Sources → *Catalogs* on a provider card opens this picker; disabled or
unconfigured providers never appear as importable.

### Static items

`CatalogDefinition.staticItems` (max 500) stores pre-resolved public ids (`tt…`, `tmdb:…`,
`anilist:…`) with name, year and optional poster. Any catalog with `staticItems` is served from
them in stored order with 20-item pages; rules and sorting still apply.

## Still follow-up

- Broader provider preview coverage beyond current adapters
- AI Ranked List save UX polish (items already persist as `staticItems`)

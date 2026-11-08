# Configuration

Native MetaLayer configurations are stored server-side and addressed by an unguessable `configId`.

Canonical model: `AGENTS.md` §22. Secret Vault: `docs/security.md`, ADR 0005. Save & Install UI: `/configure/save-install`.

## Routes

| Purpose | Pattern |
|---|---|
| Manifest | `/c/:configId/manifest.json` |
| Profile manifest | `/c/:configId/p/:profileId/manifest.json` |
| Catalog / meta | `/c/:configId/catalog\|meta/...` |
| Management API | `/api/v1/configurations/:configId` |

Edit credentials are separate from the manifest URL. The server stores only a hash; the credential must not appear in install URLs or default exports.

## Schema

Stored documents follow `MetaLayerConfig` (`@metalayer/config`): localization, sources, catalogs, rules, sorting, appearance / resolution, profiles, feature flags, revisions.

Every schema change requires a version bump, migration, fixtures, and tests (`AGENTS.md` §22.6).

## Operator flow

1. Create or import a configuration (`POST /api/v1/configurations` or legacy import).
2. Edit modules in `/configure` with the edit credential header.
3. Review revisions / restore when needed.
4. Install via Save & Install (native manifest URL without secrets).
5. Export without secrets by default; optional encrypted backup may include vault material.

## Management API (core)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/configurations` | Create persistent config + edit credential |
| GET | `/api/v1/configurations/:configId` | Public view (no secrets) |
| PUT | `/api/v1/configurations/:configId` | Update (edit credential) |
| GET | `/api/v1/configurations/:configId/revisions` | Revision history |
| POST | `/api/v1/configurations/:configId/revisions/:revisionId/restore` | Restore |
| POST | `/api/v1/configurations/import-legacy` | TMDB Addon import |

Module-specific routes (localization, catalogs, rules, sorting, resolution, tracking, …) are documented in their domain docs.

## Related

- Import from TMDB Addon: `docs/migration-from-tmdb-addon.md`
- Language & Region: `docs/language-region.md`
- Field Resolution: `docs/field-resolution-chains.md`
- Profiles: `docs/profiles.md`

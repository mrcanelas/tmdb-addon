# Configuration

Native MetaLayer configurations are stored server-side and addressed by an unguessable `configId`.

## Routes

| Purpose | Pattern |
|---|---|
| Manifest | `/c/:configId/manifest.json` |
| Profile manifest | `/c/:configId/p/:profileId/manifest.json` |
| Catalog / meta | `/c/:configId/catalog|meta/...` |
| Management API | `/api/v1/configurations/:configId` |

Edit credentials are separate from the manifest URL. The server stores only a hash; the credential must not appear in install URLs.

## Schema

Stored documents follow `MetaLayerConfig` (`@metalayer/config`): localization, sources, catalogs, rules, sorting, appearance / resolution, profiles, feature flags, revisions.

Every schema change requires a version bump, migration, fixtures, and tests (`AGENTS.md` §22).

## Related

- Import from TMDB Addon: `docs/migration-from-tmdb-addon.md`
- Secret Vault: `docs/security.md`, ADR 0005
- Language & Region API: `docs/language-region.md`
- Field Resolution: `docs/field-resolution-chains.md`

# Beta delivery hardening

This patch fixes public-delivery failures found during the beta audit, rebased onto `b30a8ba`.
The new base already includes global rules, Dashboard Providers/Settings, persisted
provider availability, the instance credential vault and OAuth vault resolution.
This patch preserves that work and extends catalog delivery with sorting,
unavailable-data warnings and filtered pagination.
It does not declare the stable release gates complete.

## Fixed

- The server build bundles workspace TypeScript with esbuild and declares its external runtime dependencies. `pnpm start` uses plain Node; it does not depend on a development TypeScript loader. CI runs `pnpm test:production` against the compiled artifact.
- Request logs redact all query strings and legacy compressed configuration segments. PublicMetaDB browser requests use `X-MetaLayer-Api-Key` instead of embedding a key in the URL. Legacy query-key callers remain accepted during migration, but are redacted; new clients must use the header or vault.
- Movie and series metadata use the shared live contribution collector and field resolver used by Inspector. Provider priorities, explicit text locales, global text fallbacks, title modes, artwork, ratings and presentation are applied to public responses. Failure of an exclusively selected provider does not silently re-enable TMDB for that field.
- TMDB list cards retain the base branch's genre, overview, rating and vote facts. Digital release status remains unknown because theatrical/air dates do not establish digital availability.
- Catalog rules and sorting run on lightweight source facts, with structured warnings for unavailable data. Studio preview uses the same delivery code. Sorting is **within each fetched source/merge page**, not a global sort of the provider's entire database. Native pagination counts delivered, filtered items, scans at most 25 source pages, deduplicates results and reports `CATALOG_SCAN_LIMIT` when that budget is exhausted. Clients receive at most 20 cards per page.
- Duplicated catalog definitions have distinct manifest IDs (`provider.catalog~instanceId`). Non-duplicated definitions retain their existing IDs. Historical `provider.catalog` requests remain aliases for the first enabled matching instance. Profile manifests keep the same compatibility behavior.
- Cards with AniList, MAL and Kitsu IDs route to the correct metadata adapter even when the card type is `movie` or `series`. The manifest advertises these prefixes and the public media types returned by anime cards.
- Local corrections are stored in an additive `local_corrections` table in both SQLite and Postgres. Each request refreshes its configuration's registry from the store, so restarts and other server processes see persisted edits. Creation, moderation and deletion are persisted; default safe exports include `localCorrections` without credentials. Movie/series field corrections and existing episode corrections apply to public metadata.
- Sample community corrections are no longer loaded into normal production instances. Test fixtures can explicitly inject a registry. This avoids shipping fictional title overrides as real metadata.
- Docker prereleases update their `alpha`, `beta` or `rc` channel, never `latest`; stable versions update `latest`. CI adds plain-Node production smoke, Lite/Server image startup checks, and Postgres/Redis integration services.

## Compatibility and operations

Configuration schema, manifest identities, config IDs, edit credentials and native/profile base URLs remain unchanged. Duplicate-only suffixed catalog IDs supplement the existing aliases. The database change is additive and initialized automatically; older binaries ignore the new table. Back up the database and encryption keys before upgrading or rolling back. Corrections created only in the old process's memory cannot be recovered after that process exits.

Safe exports are not full database backups and do not contain credentials or edit hashes. Preserve the database and encryption keys for disaster recovery; automatic import of the additional correction export field is not introduced here.

Run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm i18n:check
pnpm test
pnpm build
pnpm test:production
```

The production smoke uses only fake credentials and mock upstreams. It loads the bundled application with plain Node and injects HTTP requests; the Docker CI job additionally starts a listening process. Postgres/Redis tests run in the dedicated integration CI job; they intentionally skip without those services locally.

## Remaining release gates

- Review actual CI results for the new Docker and service integration jobs; adding jobs is not evidence they passed.
- Perform real Stremio desktop/web/Android TV installation and metadata/episode checks, and real OAuth/account-list smoke tests with maintainer-owned test accounts.
- Editable runtime Settings, native Stremio text search and delivery of additional account/AI catalog sources remain separate work. Admin provider credentials and availability are implemented in the base branch. Unimplemented catalog sources return an explicit warning, not claimed results.
- Full anime field-resolution chains, cross-provider episode identities/playback and advanced episode ordering remain follow-ups. This patch fixes anime card-to-metadata dispatch, not those larger subsystems.
- Filters requiring facts unavailable in the lightweight provider response (for example watched state or regional certification) are explicitly warned as not applied. They must not be advertised as parental-control enforcement.
- Whole-catalog sorting, deep pagination beyond the bounded scan, provider capability enforcement and complete artwork-language ranking still need work before claiming full parity with the master plan.
- Hosted rate limiting, real provider performance, security review and backup/restore rehearsal remain release requirements.

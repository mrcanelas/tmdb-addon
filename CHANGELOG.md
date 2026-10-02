# Changelog

All notable changes to MetaLayer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) as defined in `AGENTS.md` §5.

## [Unreleased]

### Stable launch prep

- Maintainer gates tracked in [release-gates.md](docs/release-gates.md).

## [1.0.0-rc.1] — 2026-10-02

### Release candidate

- Feature freeze for 1.0 scope; critical fixes only.
- Includes beta.2–beta.3 delivery: native search, catalog window, account/AI catalogs, anime episode order, localized catalog names, profile overrides, editable Dashboard Settings, rate limit, SSRF helpers, backup/restore CLIs, CI integration script aliases.
- Manual install / OAuth / backup / security soak gates remain open — see `docs/release-gates.md`.

## [1.0.0-beta.3] — 2026-10-02

### Added

- Catalog Studio localized rename editor (`name.default` + `name.values` per locale).
- Profile overrides UI and schema: rules, sorting, presentation, trackingProvider (ADR 0009).
- Editable Dashboard Settings: `instance_settings` persistence, `RuntimeSettings`, `PUT/DELETE /dashboard/settings/:key`, masked secrets, restart-pending badges.
- Rate limiting plugin, SSRF helpers (`assertSafeRemoteUrl` / `safeFetch`), `pnpm metalayer:backup` / `metalayer:restore`, `test:integration` / `test:e2e` scripts, root package renamed to `metalayer`, maintainer checklist in `docs/release-gates.md`.

## [1.0.0-beta.2] — 2026-10-02

### Release track (beta.2)

- Native Stremio text search: `metalayer.search` catalogs per media type, TMDB and anime provider search, search-only rules (`config.search`), live `/search/combined`.
- Materialized catalog window: cursor-based pagination resumes from the shared buffer, sorting plans run over the gathered window (`CATALOG_SORT_SCOPE`), TMDB `hasMore` from `total_pages`, scan/sort budgets via `METALAYER_CATALOG_SCAN_PAGES` / `METALAYER_CATALOG_SORT_PAGES`. Legacy route and Studio preview share the path.
- Account and AI catalogs are delivered live: Trakt (watchlist, recommendations, personal lists, trending, popular), new MDBList adapter (user lists, legacy `mdblist.{id}` ids), TMDB account watchlist/favorites/lists, SIMKL library statuses, AniList and MAL user lists. AI Ranked List proposals persist `staticItems` and are served in rank order. Missing credentials yield `SOURCE_CREDENTIAL_MISSING` warnings and never poison the catalog window cache.
- Studio source picker: `GET/POST /api/v1/configurations/:configId/catalog-sources[/import]` and a *Catalogs* action on Sources cards list only instance-enabled, connected providers (§8.1.1).
- Anime episode order chains: `episodes` / `episodeOrder` resolvable fields, `orderTypes` expansion in the compiler, `getEpisodes` on AniList/MAL/Kitsu, native anime `videos[]`, Fribb live optional fetch, cour/episode Identity Graph edges, order-type UI on Resolution Chains, Meta Inspector attempts.

### Beta delivery hardening

- Fix plain-Node production startup by bundling internal TypeScript packages.
- Redact credential-bearing request URLs; use headers for PublicMetaDB browser credentials.
- Apply shared movie/series field resolution, catalog filtering and page sorting to public Stremio delivery.
- Fix duplicate catalog IDs, filtered native pagination and AniList/MAL/Kitsu metadata dispatch.
- Persist local corrections in SQLite/Postgres and stop loading sample community overrides in production.
- Add production/Docker/service CI gates and keep prereleases off Docker `latest`.
- See [beta-readiness.md](docs/beta-readiness.md) for compatibility, validation and remaining release gates.

### Added

- Overview legacy TMDB Addon import (dry-run preview + confirm → Save & Install)
- Appearance Field Resolution builder for **logo** (with `no-language` default chain)
- Dashboard provider availability API/UI and Sources instance availability state
- Persistent instance provider enable/configured state for Lite and Server stores
- Instance-scoped provider API key vault for operator-managed Sources credentials
- Tracking OAuth client credentials can resolve from the instance vault before env vars
- Dashboard Providers secret-entry UI for API keys and OAuth client credentials

### Fixed

- Configure studio session React Query cache stays in sync after import and Catalog Studio draft reset
- Sources test success/failure i18n placeholders and health state labels
- Primary configure pages keep the form visible on action/preview/inspect failures
- Rules provider limitation warnings use stable codes + client i18n (not English sentences)

## [1.0.0-beta.1] — 2026-07-12

### Added

- Native MetaLayer configure SPA (`/configure`) and operator dashboard (`/admin`)
- Persistent configurations with Secret Vault (AES-256-GCM) and edit credentials
- Catalog Studio, Rules, Sorting, Appearance (Field Resolution Chains), Search & AI
- Identity Graph, Correction Hub, anime foundations, tracking OAuth (Trakt / SIMKL / AniList / MAL)
- Process-scoped provider health registry and OAuth redirect allowlist
- Locale catalogs for en-US / pt-BR / es-ES plus en-XA / ar-XB pseudo-locales

### Changed

- Product version line starts at `1.0.0-beta.1` (does not continue TMDB Addon `3.x`)
- Manifest identity `community.metalayer` (ADR 0001)

### Security

- Secrets stay out of manifest URLs; dashboard token redacted from logs
- Tracking OAuth `redirectUri` allowlisted per instance

Phase status and deferrals: `docs/phase-m-exit.md`.

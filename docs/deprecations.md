# Deprecations

MetaLayer documents removals and compatibility windows here as they are announced.

## Current posture (`1.0.0-beta.1`)

| Item | Status | Removal gate |
|---|---|---|
| Legacy TMDB Addon routes (`/:catalogChoices/...`) | Supported | Stable MetaLayer + proven migration + support window + major-version announcement (`AGENTS.md` §6.5) |
| Compressed legacy configuration in URLs | Supported (import) | Same as legacy routes |
| Alpha-era unstable schemas | Stabilizing in beta | Breaking prerelease changes require maintainer approval during beta |

When a public contract is deprecated, add a dated entry below and a `CHANGELOG.md` note.

## How to announce

1. Mark the surface deprecated in this file with date and successor.
2. Prefer a migration path and dual-run period when practical.
3. Ship the removal in a SemVer major after the support window (`docs/versioning.md`).
4. Update `docs/routes.md` and release notes.

See also: `docs/migration-from-tmdb-addon.md`, `docs/phase-m-exit.md`.

# Deprecations

MetaLayer documents removals and compatibility windows here as they are announced.

## Current posture (`1.0.0-beta.1`)

| Item | Status | Removal gate |
|---|---|---|
| Legacy URL Stremio routes (`/:catalogChoices/...`) on MetaLayer server | Supported (LEGACY manifest identity) | Stable MetaLayer + proven migration + support window + major-version announcement (`AGENTS.md` §6.5) |
| Compressed legacy configuration in URLs | Supported (compat routes + import) | Same as legacy routes |
| Express TMDB Addon runtime (`addon/`, Vite `configure/`, port 1337) | **Archived** on branch `legacy/tmdb-addon-3.1.7` — not updated on main MetaLayer line | N/A (removed from this branch) |
| Alpha-era unstable schemas | Stabilizing in beta | Breaking prerelease changes require maintainer approval during beta |

When a public contract is deprecated, add a dated entry below and a `CHANGELOG.md` note.

## How to announce

1. Mark the surface deprecated in this file with date and successor.
2. Prefer a migration path and dual-run period when practical.
3. Ship the removal in a SemVer major after the support window (`docs/versioning.md`).
4. Update `docs/routes.md` and release notes.

See also: `docs/migration-from-tmdb-addon.md`, `docs/phase-m-exit.md`.

# ADR 0001: Manifest identity independence

- Status: Accepted
- Date: 2026-07-11
- Updated: 2026-07-12 (beta finalization)
- Deciders: MetaLayer maintainers

## Context

The legacy TMDB Addon derived Stremio `manifest.id` and `manifest.version` from `package.json`.
MetaLayer must not inherit that coupling: package name/version, configuration IDs, database schema versions, and manifest identity have independent lifecycles (`AGENTS.md` §5.6).

MetaLayer also needs a dual-identity migration strategy (`AGENTS.md` §6.2):

- Legacy compatibility mode keeps the published TMDB Addon identity for existing installs.
- Native MetaLayer mode uses a stable MetaLayer manifest identity.

## Decision

1. Manifest identity lives in `@metalayer/identity` and must not be read from `package.json` name/version.
2. While the runtime remains in legacy compatibility mode, active identity is:
   - id: `tmdb-addon`
   - name: `The Movie Database Addon`
   - version: `3.1.7` (legacy published line)
3. Native MetaLayer identity (finalized for beta):
   - id: `community.metalayer`
   - name: `MetaLayer`
   - version: MetaLayer SemVer line (`1.0.0-beta.N` during Phase M; independent of the root npm package still named `tmdb-addon`)
4. Changing the native manifest ID after beta requires a major release and migration notes.

## Consequences

- Legacy installs keep a stable id/version during migration.
- MetaLayer can version independently of the npm package still named `tmdb-addon`.
- Tests must assert identity constants, not `package.json` fields.

## Alternatives considered

- Keep reading `package.json` until rebrand: rejected; perpetuates coupling.
- Change legacy id immediately to `community.metalayer`: rejected; breaks existing Stremio installs.

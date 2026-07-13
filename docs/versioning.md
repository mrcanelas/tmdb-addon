# Versioning

MetaLayer follows Semantic Versioning. The product version line starts at `1.0.0` (prereleases: `1.0.0-alpha.N`, `1.0.0-beta.N`, `1.0.0-rc.N`). It does **not** continue the legacy TMDB Addon `3.x` line.

## What is independent of package version

These identifiers have their own lifecycle (`AGENTS.md` §5.6):

- Stremio manifest ID
- Configuration schema version
- Correction schema version
- Provider adapter versions

## Where to look

| Topic | Source |
|---|---|
| Alpha / beta / RC / stable rules | `AGENTS.md` §5 |
| Release gates for `1.0.0` | `AGENTS.md` §38 |
| Published notes | `CHANGELOG.md` |
| Current beta posture | `docs/phase-m-exit.md` |

Breaking changes after stable `1.0.0` require a major release and a `BREAKING CHANGE:` commit trailer when applicable.

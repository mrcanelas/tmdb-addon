# Versioning

MetaLayer follows Semantic Versioning. The product version line starts at `1.0.0` (prereleases: `1.0.0-alpha.N`, `1.0.0-beta.N`, `1.0.0-rc.N`). It does **not** continue the legacy TMDB Addon `3.x` line.

## Current line

| Channel | Version | Notes |
|---|---|---|
| Development | `1.0.0-beta.1` | Phase M — feature freeze for new major modules |
| Next | `1.0.0-rc.N` | Phase N — release candidate |
| Stable goal | `1.0.0` | Phase O |

See `docs/phase-m-exit.md` for beta deferrals and hardening checklist. Published notes: `CHANGELOG.md`.

## What is independent of package version

These identifiers have their own lifecycle (`AGENTS.md` §5.6):

- Stremio manifest ID (`community.metalayer` — ADR 0001)
- Configuration schema version
- Correction schema version
- Provider adapter versions

## SemVer after stable

| Bump | When |
|---|---|
| Patch (`1.0.x`) | Bug fixes, security fixes that preserve compatibility, docs |
| Minor (`1.x.0`) | Backward-compatible features (new providers, optional rules/UI) |
| Major (`x.0.0`) | Incompatible public contracts, removals without migration |

Breaking changes after stable `1.0.0` require a major release and a `BREAKING CHANGE:` commit trailer when applicable.

## Where to look

| Topic | Source |
|---|---|
| Alpha / beta / RC / stable rules | `AGENTS.md` §5 |
| Release gates for `1.0.0` | `AGENTS.md` §38 |
| Published notes | `CHANGELOG.md` |
| Current beta posture | `docs/phase-m-exit.md` |
| Deprecation windows | `docs/deprecations.md` |

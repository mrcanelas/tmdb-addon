# Phase N — Release candidate

Status: **in progress** — entered at `1.0.0-rc.1`.

## Entry

Phase M deferrals closed in code through `1.0.0-beta.3` (search, catalog window, account/AI catalogs, anime episodes, localized names, profile overrides, editable Settings, hardening). Product version is `1.0.0-rc.1` (`packages/identity`).

## RC rules

- No new features.
- Critical fixes only.
- Migrations frozen except critical fixes.
- Docker tags update the `rc` channel, never `latest`.

## Exit criterion

Candidate is suitable for stable `1.0.0` once every item in [release-gates.md](release-gates.md) is checked by a maintainer (Stremio matrix, OAuth smoke, backup/restore, perf, security review, RC soak).

## Related

- `docs/phase-m-exit.md`
- `docs/beta-readiness.md`
- `CHANGELOG.md`
- `AGENTS.md` §5.4 / §38

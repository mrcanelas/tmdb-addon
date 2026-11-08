# Phase N — Release candidate

Status: **in progress** — candidate `1.0.0-rc.2`.

## Entry

Phase M delivered search, catalog windows, account and AI catalogs, anime episodes, localized names, profile overrides, and Dashboard settings. RC.2 addresses release blockers in security, legacy delivery, and deployment.

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

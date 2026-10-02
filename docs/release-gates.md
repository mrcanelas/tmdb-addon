# Release gates (maintainer)

This checklist is **not** satisfied by unit tests alone. Close each item before tagging `metalayer-v1.0.0`.

Canonical policy: `AGENTS.md` §38–§42. Delivery notes: `docs/beta-readiness.md`.

## After each prerelease cut (`beta.N` / `rc.N`)

- [ ] GitHub Actions `quality`, `integration`, and `docker-smoke` are green on the release commit
- [ ] Docker tags published for `metalayer-vX.Y.Z-…` update the correct channel (`beta` / `rc`), never `latest` until stable

## Stremio install matrix

Install the native manifest (`/c/:configId/manifest.json`) on:

- [ ] Stremio desktop (Windows or macOS)
- [ ] Stremio web
- [ ] Stremio Android TV

Verify:

- [ ] Home catalogs load; pagination / skip works past page 1
- [ ] Text search (`metalayer.search`) returns results for movie, series, anime
- [ ] Movie meta shows resolved fields and artwork
- [ ] Series meta shows `videos[]` with corrections when configured
- [ ] Anime meta shows `videos[]` with absolute/aired order from Resolution Chains
- [ ] Secondary profile manifest installs and filters catalogs

## Account integrations

Using maintainer-owned test accounts:

- [ ] Trakt OAuth + watchlist / list catalog cards
- [ ] SIMKL OAuth + library catalog
- [ ] AniList OAuth + user list catalog
- [ ] MAL OAuth + user list catalog
- [ ] TMDB session + account watchlist/favorites
- [ ] MDBList user key + list catalog
- [ ] Expired token shows reconnect state without breaking unrelated catalogs

## Operations

- [ ] Lite: `pnpm metalayer:backup` / `pnpm metalayer:restore` round-trip on SQLite
- [ ] Server: Postgres dump/restore rehearsal with vault + encryption key preserved separately
- [ ] Encryption key rotation (`pnpm metalayer:vault-reencrypt`) on a staging copy
- [ ] Dashboard editable Settings: change a hot setting and a process-restart setting; confirm restart badge
- [ ] Rate limit returns `429` / `RATE_LIMITED` under synthetic load without locking out health checks

## Performance and security

- [ ] `pnpm test:perf` (strict) against real provider keys meets or documents gaps vs `AGENTS.md` §34
- [ ] Security review (peer or external) signed in `docs/security.md`
- [ ] Migration review of legacy import fixtures + live legacy URL signed in `docs/migration-from-tmdb-addon.md`

## RC soak → stable

- [ ] `1.0.0-rc.1` (or later) runs in staging for ≥7 days with no critical defects
- [ ] Release notes in `CHANGELOG.md` list deferred items explicitly
- [ ] Tag `metalayer-v1.0.0` (Docker channel `latest`)

When an item is done, check it here and note the date/environment in the PR or release discussion — do not mark gates complete solely because CI passed.

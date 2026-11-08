# Phase I exit checklist (Tracking)

Status: **complete** — watch-state engine, hide-watched wiring, token state machine, Trakt/SIMKL adapters, vault OAuth kinds, and failure isolation.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Trakt | Done | Fixture-backed tracking adapter + registry |
| SIMKL | Done | Stub adapter + registry |
| AniList / MAL | Done | Listed in tracking status; OAuth sync later |
| Watchlists / history / progress | Partial | Watch-state model + fixtures; live sync later |
| Hide watched | Done | `annotateWatchedCandidates` + preview API |
| Token refresh | Foundation | `oauth_access` / `oauth_refresh` vault kinds + state machine |
| Reconnection states | Done | `expired` / `invalid` / `reconnect_required` / `degraded` |
| Failures do not break metadata | Done | `safeLoadWatchStates` + preview returns `ok: true` when degraded |

## Exit criterion (AGENTS.md §37 Phase I)

> tracking failures do not break metadata.

Satisfied by `POST .../tracking/preview-hide-watched` with `failTracking: true` returning HTTP 200, `degraded: true`, and catalog candidates still evaluable.

## Out of scope (later)

- Full OAuth browser flows (Trakt/AniList/MAL/SIMKL)
- Background watchlist sync / history write / check-in
- Native Stremio `trakt.watchlist` catalog routes

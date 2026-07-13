# Tracking

Tracking integrations (Trakt, SIMKL, AniList, MAL, …) expose watch state without breaking metadata when tokens fail.

Package: `@metalayer/tracking`. Configure UI: `/configure/tracking`. OAuth redirect allowlist: `docs/security.md`.

Token isolation and failure behavior: `AGENTS.md` §20. Phase I exit: `docs/phase-i-exit.md`. Proactive refresh: `pnpm metalayer:tracking-refresh`.

# Phase M — Beta stabilization

Status: **in progress** — `1.0.0-beta.1` with **feature freeze** for new major modules (hardening / i18n / docs / approved deferral closure only).

## Entry gate

Phase M began after Phases A–L product categories existed and remaining gaps were either closed or explicitly deferred.

### Closed for beta entry

| Item | Notes |
|---|---|
| Native Stremio catalog + meta | `/c/:configId/catalog/...` and `/c/:configId/meta/{movie,series,anime}/...` |
| Save & Install UI | Manifest URL + Stremio open/copy |
| Manifest identity finalized | `community.metalayer` @ `1.0.0-beta.1` (ADR 0001) |
| Language & Region UI | Shipped before entry |
| Field Resolution Chains F2 | Shipped before entry |

### Explicitly deferred (maintainer-approved)

| Item | Target |
|---|---|
| Profiles UI + `/c/.../p/:profileId/manifest.json` | **Done** (CRUD + manifest + profile-scoped catalog/meta) |
| Series (and anime) live meta gather on native route | **Done** (TMDB series + AniList anime + series episode videos; **episode reassignment + specials on native meta MVP**) |
| Advanced configure module | **Partial (MVP)** — identity preference + cache diagnostics + feature-flag readout |
| Tracking OAuth browser flows + live list sync | **Done (MVP)** — Trakt + SIMKL + AniList + MAL; shared Trakt/MAL refresh-on-401 + reconnect status |
| Proactive Trakt/MAL token refresh | **Done (MVP)** — `pnpm metalayer:tracking-refresh` + optional in-process scheduler (`METALAYER_TRACKING_REFRESH_ENABLED`) |

| Encryption key rotation tooling | **Done** — key ring + `pnpm metalayer:vault-reencrypt` |
| Postgres + Redis Server end-to-end | **Done (MVP)** — Postgres ConfigurationStore + RedisCache when REDIS_URL set |
| Field Resolution Chains inheritance/episode UX depth | **Deferred → redesigned** — dedicated `/configure/resolution` (field rail × plan editor, Stremio meta mapping); Appearance is display + bridge until page ships (`FRONTEND.md`, `docs/field-resolution-chains.md`) |
| Admin-first instance settings (replace day-two `.env`) | **Documented** — ADR 0008; Providers/Settings UI + vault APIs still to implement; env remains default until then |
| Full i18n/RTL layout hardening | **Done (MVP)** — configure + dashboard load en-XA/ar-XB with `dir`; smoke + physical-CSS guard; checklist `docs/rtl-layout-checklist.md` signed 2026-07-13 |
| Performance measurement against §34 objectives | **Done (MVP)** — p50/p95/p99 in MetricsRegistry + `pnpm test:perf` harness (strict opt-in) |
| Security / migration review sign-off | **Done (MVP)** — migration fixtures + security hardening (OAuth redirect allowlist, OAuth `state` CSRF, redaction); formal notes in `docs/security.md` |

## Phase M checklist

| Task | Status |
|---|---|
| Feature freeze for new major modules | **Done** — no new major product modules until Phase N; beta work limited to hardening, i18n/a11y, docs, and maintainer-approved deferral closure |
| UX review of configure primary pages | Partial — shell/core redesign planned (`FRONTEND.md`); FRC dedicated page documented; residual polish Open |
| Accessibility pass | **Done (MVP)** — live regions; token colors; skip-to-main; dialog/command-palette focus trap; PageHeader landmarks |
| Performance measurement | **Done (MVP)** — `pnpm test:perf`; see `docs/performance.md` |
| Migration testing (legacy import fixtures) | **Done (MVP)** — planner + API dry-run matrix across §33.5 fixtures; malformed → `LEGACY_IMPORT_FAILED`; persist vaults secrets |
| Provider reliability / degradation | **Done (MVP)** — process-scoped `ProviderHealthRegistry`; circuit state persists across requests; `GET /sources` + `GET /dashboard/health` expose snapshots |
| Security review | **Done (MVP)** — see `docs/security.md` (OAuth `state` CSRF + redact paths + allowlist) |
| Translation review (en-US / pt-BR / es-ES) | **Done (MVP)** — attention codes + dashboard pseudo labels; per-locale catalog rename editor still Open (non-blocking) |
| Pseudo-locale and RTL layout review | **Done (MVP)** — checklist signed 2026-07-13; `rtl-physical-css` guard + pseudo smoke tests |
| Field Resolution Chains review | Partial — product UX contracted (dedicated page + Stremio meta field rail); implementation of new page Open |
| Documentation pass | Partial — ADR 0008 + Admin-first + FRC/FRONTEND/AGENTS updates landed; UX mockups / deeper §36 still Open |

## Exit criterion

> all 1.0 feature categories are implemented.

Deferred items above must be closed or re-deferred with release-note callouts before Phase N (`1.0.0-rc.N`).

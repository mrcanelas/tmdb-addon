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
| Field Resolution Chains inheritance/episode UX depth | beta.N (Appearance **background + logo** + artwork `no-language` defaults landed; inheritance/episode UI still deferred) |
| Full i18n/RTL layout hardening | **Partial** — configure + dashboard load en-XA/ar-XB with `dir` + smoke tests; checklist `docs/rtl-layout-checklist.md`; signed visual pass remains |
| Performance measurement against §34 objectives | **Done (MVP)** — p50/p95/p99 in MetricsRegistry + `pnpm test:perf` harness (strict opt-in) |
| Security / migration review sign-off | Phase M → N (migration fixture coverage landed; **security hardening MVP** — dashboard token redaction + OAuth redirect allowlist; formal review still Open) |

## Phase M checklist

| Task | Status |
|---|---|
| Feature freeze for new major modules | **Done** — no new major product modules until Phase N; beta work limited to hardening, i18n/a11y, docs, and maintainer-approved deferral closure |
| UX review of configure primary pages | Partial — Overview legacy import; **studio session query sync on import + Catalog Studio reset**; Sorting loads saved plan; residual polish Open |
| Accessibility pass | Partial — live regions on primary mutation feedback; **warning/success colors use MetaLayer tokens** (--ml-warning/success/error); broader pass Open |
| Performance measurement | **Done (MVP)** — `pnpm test:perf`; see `docs/performance.md` |
| Migration testing (legacy import fixtures) | **Done (MVP)** — planner + API dry-run matrix across §33.5 fixtures; malformed → `LEGACY_IMPORT_FAILED`; persist vaults secrets |
| Provider reliability / degradation | **Done (MVP)** — process-scoped `ProviderHealthRegistry`; circuit state persists across requests; `GET /sources` + `GET /dashboard/health` expose snapshots |
| Security review | Partial — vault/redaction/OAuth allowlist landed; checklist in `docs/security.md`; formal sign-off Open |
| Translation review (en-US / pt-BR / es-ES) | Partial — Corrections samples + Inspector logo + **Rules provider-warning codes**; full catalog review Open |
| Pseudo-locale and RTL layout review | Partial — configure + **dashboard** load en-XA/ar-XB with `dir`; smoke tests; checklist at `docs/rtl-layout-checklist.md`; **signed visual pass Open** |
| Field Resolution Chains review | Partial — Appearance background/logo + Inspector logo dry-run + attempt codes; inheritance/episode UX still Open |
| Documentation pass | Partial — §36 stubs + CHANGELOG + RTL checklist; **Security/Versioning/Deprecations** narratives expanded; remaining §36 depth still Open |

## Exit criterion

> all 1.0 feature categories are implemented.

Deferred items above must be closed or re-deferred with release-note callouts before Phase N (`1.0.0-rc.N`).

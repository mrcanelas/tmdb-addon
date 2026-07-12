# Phase M — Beta stabilization

Status: **in progress** — entered `1.0.0-beta.1` with maintainer-approved deferrals.

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
| Series (and anime) live meta gather on native route | **Done** (TMDB series + AniList anime + series episode videos; specials/order corrections follow-up) |
| Advanced configure module | beta.N |
| Tracking OAuth browser flows + live list sync | **Done (MVP)** — Trakt + SIMKL + AniList + MAL; shared Trakt/MAL refresh-on-401 + reconnect status |

| Encryption key rotation tooling | post-beta (Phase B carry-over) |
| Postgres + Redis Server end-to-end | **Partial** — Postgres ConfigurationStore + compose; Redis sidecar up, shared cache still memory |
| Field Resolution Chains inheritance/episode UX depth | beta.N |
| Full i18n/RTL layout hardening | Phase M tasks |
| Performance measurement against §34 objectives | Phase M tasks |
| Security / migration review sign-off | Phase M → N |

## Phase M checklist

| Task | Status |
|---|---|
| Feature freeze for new major modules | Open — minimize new surface |
| UX review of configure primary pages | Open |
| Accessibility pass | Open |
| Performance measurement | Open |
| Migration testing (legacy import fixtures) | Open |
| Provider reliability / degradation | Open |
| Security review | Open |
| Translation review (en-US / pt-BR / es-ES) | Open |
| Pseudo-locale and RTL layout review | Open |
| Field Resolution Chains review | Open |
| Documentation pass | Open |

## Exit criterion

> all 1.0 feature categories are implemented.

Deferred items above must be closed or re-deferred with release-note callouts before Phase N (`1.0.0-rc.N`).

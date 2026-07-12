# Phase F exit checklist (Metadata Resolver and Meta Inspector)

Status: **baseline complete** — field-level resolution with provenance, locale-aware fallbacks, title/description modes, inspect API, and minimal Meta Inspector UI. Field Resolution Chains (§10 F2) remain outstanding for product-complete Phase F.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Field-level provider selection | Done | `fieldProviders` on config + `resolveField` chains |
| Locale-aware fallback chains | Done | `preferred-language` policy + `LOCALE_FALLBACK` warning |
| Original / localized title modes | Done | `formatTitle` / `formatDescription` |
| Provenance | Done | `selectedProvider`, `attemptedProviders` |
| Confidence | Done | per contribution + `highest-confidence` for ratings |
| Exclusion reasons | Done | `exclusionReason` when no usable value |
| Live inspection | Done | `POST .../inspect` (dry-run contributions or live TMDB+) |
| Every field explains its source | Done | unit + API tests assert provenance on all fields |

## Out of scope (later phases)

- Full Stremio `/c/:configId/meta/:type/:id.json` route (uses the same resolver when wired)
- Series/anime live gather beyond movie TMDB path
- Community corrections overlay (Phase J — now landed)
- **Field Resolution Chains** (`AGENTS.md` §10 F2): locale-first / provider-first / explicit plans, `ResolutionChainBuilder`, full attempt Inspector — designed after Phase F baseline; implementation outstanding

## Exit criterion (AGENTS.md §37 Phase F)

> every resolved field can explain its source.

Satisfied for the **baseline** resolver. Phase F is **product-complete** only after F2 Field Resolution Chains ship.
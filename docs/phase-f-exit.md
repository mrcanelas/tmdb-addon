# Phase F exit checklist (Metadata Resolver and Meta Inspector)

Status: **complete** — field-level resolution with provenance, locale-aware fallbacks, title/description modes, inspect API, and minimal Meta Inspector UI.

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

## Exit criterion (AGENTS.md §37 Phase F)

> every resolved field can explain its source.

Satisfied by `@metalayer/metadata-resolver` unit tests and the Meta Inspector report shape returned by the management API.

## Out of scope (later phases)

- Full Stremio `/c/:configId/meta/:type/:id.json` route (uses the same resolver when wired)
- Series/anime live gather beyond movie TMDB path
- Community corrections overlay (Phase J)

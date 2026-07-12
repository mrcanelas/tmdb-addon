# Phase F exit checklist (Metadata Resolver and Meta Inspector)

Status: **product-complete** — baseline field resolution (F1) plus Field Resolution Chains (F2).

## F1 — Baseline

| Item | Status | Notes |
|---|---|---|
| Field-level provider selection | Done | `fieldProviders` on config + `resolveField` chains |
| Locale-aware fallback chains | Done | `preferred-language` policy + `LOCALE_FALLBACK` warning |
| Original / localized title modes | Done | `formatTitle` / `formatDescription` |
| Provenance | Done | `selectedProvider`, `attemptedProviders` |
| Confidence | Done | per contribution + `highest-confidence` for ratings (legacy path) |
| Exclusion reasons | Done | `exclusionReason` when no usable value |
| Live inspection | Done | `POST .../inspect` (dry-run contributions or live TMDB+) |
| Every field explains its source | Done | unit + API tests assert provenance on all fields |

## F2 — Field Resolution Chains (§10)

| Item | Status | Notes |
|---|---|---|
| `FieldResolutionPlan` / `ResolutionConfig` schemas | Done | Zod in `packages/config` (`resolution.ts`); optional `config.resolution` |
| Plan derivation from `fieldProviders` | Done | `resolutionConfigFromFieldProviders` / `planFromProviderChain` |
| Strategy expansion | Done | `locale-first`, `provider-first`, `explicit` in `compile.ts` |
| Runtime resolve from plan | Done | `resolveFieldFromPlan` with `attempts[]` + `effectivePlanHash` |
| Chains enabled by default | Done | `useFieldResolutionChains !== false` in `resolveWork` |
| Management APIs | Done | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |
| ResolutionChainBuilder UI | Done | Appearance page for title / description / poster |
| Meta Inspector attempts | Done | per-field attempt list (provider · locale · status · reason) |
| i18n `resolution` namespace | Done | en-US / pt-BR / es-ES (+ pseudo) |

### Deferred follow-ups (not blocking Phase F exit)

- Full inheritance UI for profile → catalog → title overrides (compiler layers exist; product UX incomplete).
- Advanced explicit step editor beyond ordered provider chains.
- Episode / anime order types wired through Corrections (Phase J) in the chain UI.
- Dedicated artwork no-language ranking policy beyond provider-first expansion.
- Legacy `language` / `provider` / `artProvider` URL migration into plans (native `fieldProviders` bridge ships).
- Shared cache keys including `effectivePlanHash` when Redis/shared catalog-meta caches land.

## Out of scope (other phases)

- Full Stremio `/c/:configId/meta/:type/:id.json` route (uses the same resolver when wired).
- Series/anime live gather beyond movie TMDB path.

## Exit criterion (AGENTS.md §37 Phase F)

> every resolved field can explain its source.

Satisfied for baseline **and** Field Resolution Chains. Phase F is **product-complete**.

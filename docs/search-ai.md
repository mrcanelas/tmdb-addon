# Search and AI

MetaLayer Search & AI (`@metalayer/search-ai`) turns natural language and multi-provider search into **validated** configuration changes.

Configure UI: `/configure/search-ai`. Canonical product rules: `AGENTS.md` §16. Phase K exit: `docs/phase-k-exit.md`.

## Safety rules

- AI never receives vault secrets or full private configuration.
- AI never silently mutates configuration.
- Every proposal requires `confirm: true` on apply.
- Generated filters must pass `RuleSetSchema` before use.

## Modes

| Mode | Behavior |
|---|---|
| **Combined search** | Merge and dedupe provider hits |
| **Smart Discovery** | NL → structured discovery plan / rules (+ proposal) |
| **Ranked List** | Ordered titles → identity resolve → optional catalog save proposal |

## Operator flow

1. Open `/configure/search-ai` (draft session bootstraps if needed).
2. Run combined search, Smart Discovery, or Ranked List.
3. Review interpreted intent, warnings/assumptions, unresolved titles, and duplicates.
   Warnings, assumptions, intent, and proposal **summaries** use **stable codes** (`DUPLICATE_DROPPED`, `NO_EXTERNAL_IDS`, `SMART_DISCOVERY_SUMMARY`, …). The configure UI translates them via `searchAi.warning.*` / `searchAi.assumption.*` / `searchAi.intent.*` / `searchAi.summary.*`.
4. Confirm apply only when the proposal looks correct — UI never auto-saves.
5. Action failures stay on the page with an alert; session bootstrap failures use retry.

## Management API

All routes require `X-MetaLayer-Edit-Credential`. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/configurations/:configId/search/combined` | Combined provider search |
| POST | `/configurations/:configId/search/smart-discovery` | NL → plan + proposal |
| POST | `/configurations/:configId/search/ranked-list` | Ranked titles + proposal |
| POST | `/configurations/:configId/ai/apply-proposal` | Apply with `confirm: true` |

## Configure UI notes

`/configure/search-ai` localizes demo seed prompts and result lines via the `searchAi` namespace (no hard-coded English seeds or label+value concatenation).

## Still follow-up

- Full proposal diff visualization before apply
- Saving Ranked Lists directly into Catalog Studio with richer conflict UX
- Additional AI providers behind the structured-output layer

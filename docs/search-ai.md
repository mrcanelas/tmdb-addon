# Search and AI

MetaLayer Search & AI (`@metalayer/search-ai`) turns natural language and multi-provider search into **validated** configuration changes.

Configure UI: `/configure/sources/search` (hub: `/configure/sources`). Canonical product rules: `AGENTS.md` §16. Phase K exit: `docs/phase-k-exit.md`.

## Safety rules

- AI never receives vault secrets or full private configuration.
- AI never silently mutates configuration.
- Every proposal requires `confirm: true` on apply.
- Generated filters must pass `RuleSetSchema` before use.

## Modes

| Mode | Behavior |
|---|---|
| **Native Stremio search** | Manifest exposes one `metalayer.search` catalog per media type (`extra: search` required, so it never renders on Home). Movie/series use TMDB `/search`; anime uses the anime providers of the configured anime catalogs (AniList by default). |
| **Combined search** | Live provider hits merged and deduped through the same search path |
| **Smart Discovery** | NL → structured discovery plan / rules (+ proposal) |
| **Ranked List** | Ordered titles → identity resolve → optional catalog save proposal |

## Search isolation (`AGENTS.md` §13.8)

`config.search` controls native search:

```json
{ "search": { "enabled": true, "rules": { "minimumRating": 5 } } }
```

- `enabled: false` removes the search catalogs from the manifest and makes `/catalog/:type/metalayer.search/...` return `{ "metas": [] }`.
- `rules` run **only** in the search context. Global and catalog discovery rules are never applied to search results, and provider relevance order is preserved (no sorting plan).
- Missing TMDB credential → `SOURCE_CREDENTIAL_MISSING` warning; provider failures → `SEARCH_PROVIDER_FAILED`; unavailable anime provider → `CATALOG_PROVIDER_UNAVAILABLE`. Results are never faked.
- The legacy `/:catalogChoices/catalog/...` route serves the same search catalogs.

## Operator flow

1. Open `/configure/sources/search` (draft session bootstraps if needed).
2. Run combined search, Smart Discovery, or Ranked List.
3. Review interpreted intent, warnings/assumptions, unresolved titles, and duplicates.
   Warnings, assumptions, intent, and proposal **summaries** use **stable codes** (`DUPLICATE_DROPPED`, `NO_EXTERNAL_IDS`, `SMART_DISCOVERY_SUMMARY`, …). The configure UI translates them via `searchAi.warning.*` / `searchAi.assumption.*` / `searchAi.intent.*` / `searchAi.summary.*`.
4. Confirm apply only when the proposal looks correct — UI never auto-saves.
5. Action failures stay on the page with an alert; session bootstrap failures use retry.

## Management API

All routes require `X-MetaLayer-Edit-Credential`. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/configurations/:configId/search/combined` | Live combined search (`query`, optional `mediaTypes: ["movie","series","anime"]`) |
| POST | `/configurations/:configId/search/smart-discovery` | NL → plan + proposal |
| POST | `/configurations/:configId/search/ranked-list` | Ranked titles + proposal |
| POST | `/configurations/:configId/ai/apply-proposal` | Apply with `confirm: true` |

## Configure UI notes

`/configure/sources/search` localizes demo seed prompts and result lines via the `searchAi` namespace (no hard-coded English seeds or label+value concatenation).

## Ranked List delivery

Confirming a Ranked List proposal creates a `metalayer/ai.ranked-list` catalog whose resolved,
non-duplicate items are stored as `CatalogDefinition.staticItems` in rank order (public ids
only — IMDb preferred, then `tmdb:`/`anilist:`). Stremio serves the catalog from those items;
unresolved candidates are reported in the proposal explanation and never become cards.

## Still follow-up

- Full proposal diff visualization before apply
- Richer conflict UX when a Ranked List overlaps an existing catalog
- Additional AI providers behind the structured-output layer

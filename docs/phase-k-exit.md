# Phase K exit checklist (Search and AI)

Status: **complete** — combined search, Smart Discovery, Ranked List, structured validation, explainability, save-as-catalog, and AI proposals with mandatory confirmation.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Combined search | Done | `combineSearchHits` + `POST .../search/combined` |
| Smart Discovery | Done | Prompt → validated `DiscoveryPlan` / `RuleSet` |
| Ranked List | Done | Resolve identity, duplicates, unresolved |
| Structured validation | Done | `validateDiscoveryPlan` + `RuleSetSchema` |
| Explainability | Done | `AiExplanation` on every proposal |
| Save as catalog | Done | Confirmed proposal → `ai.ranked-list` catalog |
| AI assistant proposals | Done | Diff proposals; `confirm: true` required |
| Never bypass rules/schema | Done | AI output re-validated; apply gated |

## Exit criterion (AGENTS.md §37 Phase K)

> AI never bypasses the rules and schema layers.

Satisfied by: discovery plans must pass `RuleSetSchema`; `POST .../ai/apply-proposal` returns `AI_CONFIRMATION_REQUIRED` unless `confirm: true`; secrets are sanitized before AI context.

## Out of scope (later)

- Live Gemini / OpenRouter network adapters
- Person / company / network / collection search modes against live providers
- Rich visual proposal diff editor

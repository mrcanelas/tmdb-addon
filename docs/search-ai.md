# Search and AI

MetaLayer Search & AI (`@metalayer/search-ai`) turns natural language and multi-provider search into **validated** configuration changes.

## Safety rules

- AI never receives vault secrets or full private configuration.
- AI never silently mutates configuration.
- Every proposal requires `confirm: true` on apply.
- Generated filters must pass `RuleSetSchema` before use.

## Modes

- **Combined search** — merge and dedupe provider hits
- **Smart Discovery** — NL → structured discovery plan / rules
- **Ranked List** — ordered titles → identity resolve → optional catalog save

## Management API

- `POST /api/v1/configurations/:configId/search/combined`
- `POST /api/v1/configurations/:configId/search/smart-discovery`
- `POST /api/v1/configurations/:configId/search/ranked-list`
- `POST /api/v1/configurations/:configId/ai/apply-proposal`

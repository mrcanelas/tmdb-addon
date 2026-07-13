# Rules

Rule Studio is a coherent filtering engine with inheritance across global → profile → catalog → context. Unsupported provider rules surface structured warnings instead of silent ignores.

Package: `@metalayer/rules`. Configure UI: `/configure/rules`.

Canonical operations, fields, and search isolation: `AGENTS.md` §13. Phase E exit: `docs/phase-e-exit.md`.

## Fields editable in beta configure

Global rules MVP in the configure UI:

| Field | Purpose |
|---|---|
| `excludeAdult` | Drop adult-marked candidates |
| `minimumRating` | Minimum rating threshold |
| `minimumVotes` | Minimum vote-count threshold |
| `releasedOnly` | Theatrical / aired release required |
| `digitallyReleasedOnly` | Digital release required |

Full `RuleSet` (genres, runtime, certifications, networks, hide watched, etc.) is schema-supported; richer Studio controls remain a follow-up. Catalog-level rules attach on `CatalogDefinition.rules` and merge via `resolveEffectiveRules`.

## Operator flow

1. Open `/configure/rules` with edit credential.
2. Load effective rules (`GET .../rules/effective`) — includes provider capability warnings.
3. Adjust global fields and **Preview** against sample candidates.
4. Save with `PUT .../rules` (creates a configuration revision).
5. Empty catalogs still return `{ "metas": [] }` when rules exclude everything.

Search scopes must stay explicit — discovery rules must not silently alter text search (`AGENTS.md` §13.8).

## Management API

All routes require `X-MetaLayer-Edit-Credential`. Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/rules/effective` | Effective RuleSet + warnings (`?provider=`, `?catalogInstanceId=`) |
| POST | `/configurations/:configId/rules/preview` | Include/exclude sample items |
| PUT | `/configurations/:configId/rules` | Persist `globalRules` |

## Still follow-up

- Full RuleSet field editors and prefer/boost/penalize UX
- Profile/context inheritance UI beyond global + catalog merge
- Provider-specific unsupported-rule surfacing in every Studio surface

# Field Resolution Chains

Canonical product and architecture requirements for Field Resolution Chains live in:

```text
AGENTS.md §10 — Metadata Resolver and Field Resolution Chains
```

Implementation status: **shipped** as Phase F2 (schema/API/builder MVP) — see `docs/phase-f-exit.md`. UX redesign (dedicated page) is planned — see `FRONTEND.md` and `docs/phase-m-exit.md`.

## Configure surfaces

| Surface | Fields / behavior |
|---|---|
| **Resolution Chains** (`/configure/resolution`) | **Primary editor (target):** left rail of Stremio [meta](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md)-mapped fields → plan editor (strategy, providers, locales, Prev/Next). Independent layout pattern — do not copy third-party source. |
| Appearance (`/configure/appearance`) | Display-oriented; may deep-link into Resolution Chains. Current beta still hosts `ResolutionChainBuilder` for title / description / poster / background / logo until the dedicated page ships. |
| Meta Inspector | Attempt list with localized status/reason codes (`inspector.resolutionWarning.*`) |
| Management API | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |

Only **instance-available** providers appear in pickers (`AGENTS.md` §8.1.1, ADR 0008).

Artwork defaults include `no-language` for poster/background. See `docs/appearance.md`.

## Still follow-up

- Ship dedicated `/configure/resolution` page (field rail UX)
- Profile / catalog / title inheritance UI
- Explicit advanced step editor and episode-order chains
- Dedicated artwork ranking polish beyond default `no-language` chains

Related:

- Meta Inspector attempt display — `AGENTS.md` §11
- Appearance artwork behavior — `AGENTS.md` §15.3
- Implementation phase — `AGENTS.md` Phase F
- Frontend guide — `FRONTEND.md`

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

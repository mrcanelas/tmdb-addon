# Field Resolution Chains

Canonical product and architecture requirements for Field Resolution Chains live in:

```text
AGENTS.md §10 — Metadata Resolver and Field Resolution Chains
```

Implementation status: **shipped** as Phase F2 (schema/API/builder MVP) — see `docs/phase-f-exit.md`. UX redesign (dedicated page) is planned — wireframe `docs/ux-mocks/configure-resolution.html`, contract `FRONTEND.md`, decisions `docs/ux-mocks/DECISIONS.md`.

## Configure surfaces

| Surface | Fields / behavior |
|---|---|
| **Metas → Fields** (`/configure/metas/fields`) | Primary Field Resolution Chains editor (Meta Builder UI label). |
| **Metas → Appearance** (`/configure/metas/appearance`) | Display-oriented; may host or deep-link into chain builders. |
| Meta Inspector (`/configure/review/inspector`) | Attempt list with localized status/reason codes (`inspector.resolutionWarning.*`) |
| Management API | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |

Only **instance-available** providers appear in pickers (`AGENTS.md` §8.1.1, ADR 0008).

Artwork defaults include `no-language` for poster/background. See `docs/appearance.md`.

## Still follow-up

- Deeper field-rail UX under `/configure/metas/fields` (wireframe `docs/ux-mocks/configure-resolution.html`)
- Profile / catalog / title inheritance UI
- Explicit advanced step editor and episode-order chains
- Dedicated artwork ranking polish beyond default `no-language` chains

Related:

- Meta Inspector attempt display — `AGENTS.md` §11
- Appearance artwork behavior — `AGENTS.md` §15.3
- Implementation phase — `AGENTS.md` Phase F
- Frontend guide — `FRONTEND.md`

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

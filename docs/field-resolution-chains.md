# Field Resolution Chains

Canonical product and architecture requirements for Field Resolution Chains live in:

```text
AGENTS.md §10 — Metadata Resolver and Field Resolution Chains
```

Implementation status: **shipped** as Phase F2 — see `docs/phase-f-exit.md`.

## Configure surfaces (beta)

| Surface | Fields / behavior |
|---|---|
| Appearance (`/configure/appearance`) | title, description, poster, background via `ResolutionChainBuilder` |
| Meta Inspector | Attempt list with localized status/reason codes |
| Management API | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |

Artwork defaults include `no-language` for poster/background. See `docs/appearance.md`.

## Still follow-up

- Profile / catalog / title inheritance UI
- Explicit advanced step editor and episode-order chains in Appearance
- Dedicated artwork ranking polish beyond default `no-language` chains

Related:

- Meta Inspector attempt display — `AGENTS.md` §11
- Appearance artwork behavior — `AGENTS.md` §15.3
- Implementation phase — `AGENTS.md` Phase F

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

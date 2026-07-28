# Field Resolution Chains

Canonical product and architecture requirements for Field Resolution Chains live in:

```text
AGENTS.md §10 — Metadata Resolver and Field Resolution Chains
```

Implementation status: **shipped** as Phase F2 (schema/API/builder) with a dedicated Metas → Fields workspace.

## Configure surfaces

| Surface | Fields / behavior |
|---|---|
| **Metas → Fields** (`/configure/metas/fields`) | Primary Field Resolution Chains editor: searchable field rail, Simple/Explicit plan editor, live draft preview. Deep link: `?field=title`. |
| **Metas → General** (`?field=general`) | Language/region + presentation; seeds locale order for field chains |
| Meta Inspector (`/configure/review/inspector`) | Attempt list with localized status/reason codes (`inspector.resolutionWarning.*`) |
| Management API | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |

## Field rail

The Fields rail lists settings and metadata fields in one sidebar:

1. **General** — single `general` settings panel (language, region, presentation)
2. **Localized text / Artwork / Facts / Credits / Ratings / Episode structure**

- **Editable now:** `general`, `title`, `originalTitle`, `description`, `poster`, `background`, `logo`, `rating`, `voteCount`, `releaseDate`, `externalIds`
- **Visible, coming soon:** `tagline`, `genres`, `runtime`, `certification`, `cast`, `directors`, `writers`, `episodes`, `episodeOrder`

Deep links: `/configure/metas/fields?field=general`, `?field=title`, etc. Legacy `?field=language` / `?field=appearance` and `/metas/language` / `/metas/appearance` redirect to `?field=general`.

Default field plan locales seed from General display languages (`metadataLocale` + fallbacks), not a hardcoded `pt-BR`.
## Draft preview

`POST /api/v1/configurations/:configId/resolution/test` accepts an optional `plan` body.

- The temporary plan is compiled and resolved against the supplied contributions.
- Nothing is persisted when `plan` is present (`temporary: true` in the response).
- Fields preview uses deterministic sample contributions (Breaking Bad) so unsaved edits are explainable immediately.
- The right-hand panel is a Stremio-like meta detail preview (independent implementation — not copied from GPLv2 `stremio-web`): logo, blurred backdrop, runtime/year/IMDb, overview, genre/cast/director pills, and a decorative action bar. The resolved field from the draft plan overlays the sample meta; provenance and Inspector remain in the footer.

Artwork defaults include `no-language` for poster/background/logo. See `docs/appearance.md`.

## Instance availability gate

Provider pickers derive from `GET /api/v1/sources` instead of a static list (`AGENTS.md` §8.1.1, ADR 0008).

A provider can be **added** to a chain only when all hold:

- `connectionState` is not `coming_soon`;
- `adapterAvailable` is true;
- the provider declares the field in `capabilities.metadataFields`.

Behavior rules:

- Providers already in a saved chain are **never silently removed**. They keep their position, gain a warning mark, and the section explains that they are skipped during resolution (`AGENTS.md` §4.3).
- The effective-order table strikes through unavailable steps so the skipped attempts stay visible.
- Fields the capability model cannot express (runtime, certification, directors, writers, release dates) are **not** filtered — hiding providers for an undeclared constraint would be a false negative.
- While `/api/v1/sources` is loading or unreachable, availability is `undefined` and nothing is filtered.

## Still follow-up

- Profile / catalog / title inheritance UI
- Episode-order chains and credits/facts field persistence
- Server-side `resolution/compile` should also mark unavailable providers (the UI gate is client-side today)
- Capability model lacks fields for runtime / certification / release dates / writers
- Dedicated artwork ranking polish beyond default `no-language` chains

Related:

- Meta Inspector attempt display — `AGENTS.md` §11
- Appearance artwork behavior — `AGENTS.md` §15.3
- Implementation phase — `AGENTS.md` Phase F
- Frontend guide — `FRONTEND.md`

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

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
| **Metas → Appearance** (`/configure/metas/appearance`) | Display-oriented stack of artwork/title builders; deep-links into Fields remain supported via navigation. |
| Meta Inspector (`/configure/review/inspector`) | Attempt list with localized status/reason codes (`inspector.resolutionWarning.*`) |
| Management API | `GET/PUT .../resolution`, `POST .../compile`, `POST .../test` |

## Field rail

The Fields rail lists settings and metadata fields in one sidebar:

1. **General** — `language`, `appearance` (settings panels embedded in Fields; not separate pages)
2. **Localized text / Artwork / Facts / Credits / Ratings / Episode structure**

- **Editable now:** `language`, `appearance`, `title`, `originalTitle`, `description`, `poster`, `background`, `logo`, `rating`, `voteCount`, `releaseDate`, `externalIds`
- **Visible, coming soon:** `tagline`, `genres`, `runtime`, `certification`, `cast`, `directors`, `writers`, `episodes`, `episodeOrder`

Deep links: `/configure/metas/fields?field=language`, `?field=appearance`, `?field=title`, etc. Legacy `/metas/language` and `/metas/appearance` redirect into those query params.

## Draft preview

`POST /api/v1/configurations/:configId/resolution/test` accepts an optional `plan` body.

- The temporary plan is compiled and resolved against the supplied contributions.
- Nothing is persisted when `plan` is present (`temporary: true` in the response).
- Fields preview uses deterministic sample contributions (Breaking Bad) so unsaved edits are explainable immediately.
- The right-hand panel is a Stremio-like meta detail preview (independent implementation — not copied from GPLv2 `stremio-web`): logo, blurred backdrop, runtime/year/IMDb, overview, genre/cast/director pills, and a decorative action bar. The resolved field from the draft plan overlays the sample meta; provenance and Inspector remain in the footer.

Artwork defaults include `no-language` for poster/background/logo. See `docs/appearance.md`.

## Still follow-up

- Profile / catalog / title inheritance UI
- Episode-order chains and credits/facts field persistence
- Instance-available provider filtering in pickers
- Dedicated artwork ranking polish beyond default `no-language` chains

Related:

- Meta Inspector attempt display — `AGENTS.md` §11
- Appearance artwork behavior — `AGENTS.md` §15.3
- Implementation phase — `AGENTS.md` Phase F
- Frontend guide — `FRONTEND.md`

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

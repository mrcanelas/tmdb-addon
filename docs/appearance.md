# Appearance

Appearance Studio controls how metadata and artwork are **presented** in Stremio-like previews. Artwork and localized text **resolution** use Field Resolution Chains (`AGENTS.md` §10 / §15).

Canonical FRC index: `docs/field-resolution-chains.md`. Phase F exit: `docs/phase-f-exit.md`. Frontend targets: `FRONTEND.md`.

## Primary vs bridge surfaces

| Surface | Role |
|---|---|
| `/configure/metas/fields` | **Primary** chain editor: field rail, Simple/Explicit builder, draft preview |
| `/configure/metas/appearance` | Display-oriented stack of title/artwork builders |

## Fields editable in beta configure

| Field | Kind | Default strategy | Default providers (when unset) | Default locales |
|---|---|---|---|---|
| `title` | Localized text | `locale-first` | TMDB → TVDB | pt-BR → en-US → original-language |
| `description` | Localized text | `locale-first` | TMDB → TVDB | pt-BR → en-US → original-language |
| `poster` | Artwork | `locale-first` | RPDB → Fanart.tv → TMDB | pt-BR → **no-language** → en-US |
| `background` | Artwork | `locale-first` | Fanart.tv → TMDB → RPDB | pt-BR → **no-language** → en-US |
| `logo` | Artwork | `locale-first` | RPDB → Fanart.tv → TMDB → TVDB | pt-BR → **no-language** → en-US |

Provider pickers must only offer **instance-available** providers (`AGENTS.md` §8.1.1). Defaults are applied client-side via `ensureFieldPlan` when a stored plan is missing; saving persists the full `ResolutionConfig`.

`no-language` is a first-class locale preference for artwork (textless posters/backgrounds). It is not treated as missing metadata.

## Operator flow

1. Prefer `/configure/metas/fields`; display polish lives under `/configure/metas/appearance` (edit credential required).
2. Adjust strategy (language-first / provider-first), provider order, and locale order per field.
3. Save — writes `PUT /api/v1/configurations/:configId/resolution`.
4. Verify selection and fallbacks in Meta Inspector (`AGENTS.md` §11) for a sample title.

Live Stremio-like previews for catalog/movie/series cards remain a follow-up; resolution compile/test APIs already exist for diagnostics.

## Management API

All routes require a valid edit credential (`X-MetaLayer-Edit-Credential`). Base path: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/configurations/:configId/resolution` | Load versioned `ResolutionConfig` |
| PUT | `/configurations/:configId/resolution` | Persist Field Resolution plans |
| POST | `/configurations/:configId/resolution/compile` | Expand inheritance into an effective plan |
| POST | `/configurations/:configId/resolution/test` | Resolve a sample identity and return attempts |

Secrets must never appear in plans or diagnostics.

## Still follow-up (not blocking Phase F exit)

- Dedicated Resolution Chains page (move builders out of Appearance)
- Profile / catalog / title inheritance UI for Appearance overrides
- Remaining §15 display sections (credits, certifications, live preview)
- Dedicated artwork ranking polish beyond default `no-language` chains

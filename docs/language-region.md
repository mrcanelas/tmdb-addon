# Language and region

Configure UI for `LocalizationPreferences` (and presentation) lives at `/configure/metas/fields?field=general`.

Canonical product rules: `AGENTS.md` §9. Interface catalogs: `docs/internationalization.md`. RTL checklist: `docs/rtl-layout-checklist.md`.

## Simple vs Advanced

| Mode | Behavior |
|---|---|
| **Simple** | Interface locale aligns metadata locale; one country drives content, availability, certification, and release regions |
| **Advanced** | Interface locale, metadata locale order, timezone, title/description modes, and each region are independent |

Changing interface language must not silently change content region.

## Preferences (persisted)

Typical fields on `LocalizationPreferences`:

- `interfaceLocale`, `metadataLocale`, `metadataFallbackLocales` (ordered display languages)
- `titleMode`, `descriptionMode`
- `contentRegion`, `availabilityRegion`, `certificationRegion`, `releaseRegion`
- `timezone` (calendar / episode premiere semantics — callers still follow-up)

General UI uses a multi-select ordered list for display languages. The first entry is `metadataLocale`; the rest are `metadataFallbackLocales`. Options come from `GET /api/v1/languages` (legacy TMDB Addon fallback catalog).

**Apply languages to field chains** updates non-explicit field plans so their locale priority matches this order.

Persist via `GET/PUT /api/v1/configurations/:configId/localization` (edit credential required). Profiles may override a subset (`docs/profiles.md`).

Field-level provider/locale chains are edited under **Metas → Fields** (`docs/field-resolution-chains.md`).

## Cache impact

Response caches must include every locale/region value that affects output (metadata locale, fallback-chain hash, title mode, regions, timezone when relevant). Do not share localized output across incompatible configurations.

## Pseudo-locales (layout QA)

The configure shell (and dashboard) can switch to `en-XA` (expanded LTR) and `ar-XB` (RTL + `dir=rtl`).

## Still follow-up

- End-to-end localized catalog display-name editing in UI
- Consume timezone in Trakt Calendar / episode air-date formatting
- Apply `titleMode` / `descriptionMode` on the public meta route (today Inspector-only)

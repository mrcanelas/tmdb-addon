# Language and region

Configure UI for `LocalizationPreferences` lives at `/configure/language-region`.

Canonical product rules: `AGENTS.md` §9. Interface catalogs: `docs/internationalization.md`. RTL checklist: `docs/rtl-layout-checklist.md`.

## Simple vs Advanced

| Mode | Behavior |
|---|---|
| **Simple** | Interface locale aligns metadata locale; one country drives content, availability, certification, and release regions |
| **Advanced** | Interface locale, metadata locale, fallback list, timezone, title/description modes, and each region are independent |

Changing interface language must not silently change content region.

## Preferences (persisted)

Typical fields on `LocalizationPreferences`:

- `interfaceLocale`, `metadataLocale`, `metadataFallbackLocales`
- `titleMode`, `descriptionMode`
- `contentRegion`, `availabilityRegion`, `certificationRegion`, `releaseRegion`
- `timezone`, optional date/time/number formatting styles

Configure selectors show **localized labels** via `@metalayer/i18n` `Intl.DisplayNames` helpers (`formatLanguageDisplayName`, `formatRegionDisplayName`, `formatTimezoneDisplayName`) while keeping stable codes in the option value.

Persist via `GET/PUT /api/v1/configurations/:configId/localization` (edit credential required). Profiles may override a subset (`docs/profiles.md`).

Field-level provider/locale chains are edited in **Resolution Chains** (`/configure/resolution`, `docs/field-resolution-chains.md`); this page sets global locale/region defaults those plans consume.

## Cache impact

Response caches must include every locale/region value that affects output (metadata locale, fallback-chain hash, title mode, regions, timezone when relevant). Do not share localized output across incompatible configurations.

## Pseudo-locales (layout QA)

The configure shell (and dashboard) can switch to `en-XA` (expanded LTR) and `ar-XB` (RTL + `dir=rtl`). Catalogs load from `apps/frontend/src/lib/i18n-resources.ts` / dashboard resources so QA exercises overflow and direction without falling back to en-US copy.

## Still follow-up

- End-to-end localized catalog display-name editing in UI
- Live metadata preview wired to real resolve (Language & Region right rail)

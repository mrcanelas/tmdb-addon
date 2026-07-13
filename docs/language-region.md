# Language and region

Configure UI for `LocalizationPreferences` lives at `/configure/language-region`.

Canonical product rules: `AGENTS.md` §9.

## Behavior

- **Simple mode:** interface locale aligns metadata locale; one country drives content, availability, certification, and release regions.
- **Advanced mode:** interface locale, metadata locale, fallback list, and each region are independent.
- Changing interface language does not silently change content region.
- Persist via `GET/PUT /api/v1/configurations/:configId/localization`.

## Pseudo-locales (layout QA)

The configure shell can switch to `en-XA` (expanded LTR) and `ar-XB` (RTL marks + `dir=rtl`). Catalogs are registered in `apps/frontend/src/lib/i18n-resources.ts` so QA exercises overflow and direction without falling back to en-US copy.

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

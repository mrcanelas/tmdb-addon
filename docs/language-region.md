# Language and region

Configure UI for `LocalizationPreferences` lives at `/configure/language-region`.

Canonical product rules: `AGENTS.md` §9.

## Behavior

- **Simple mode:** interface locale aligns metadata locale; one country drives content, availability, certification, and release regions.
- **Advanced mode:** interface locale, metadata locale, fallback list, and each region are independent.
- Changing interface language does not silently change content region.
- Persist via `GET/PUT /api/v1/configurations/:configId/localization`.

Do not duplicate normative rules here; update `AGENTS.md` when the model changes.

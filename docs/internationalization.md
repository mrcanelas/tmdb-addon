# Internationalization

Interface localization, metadata language, and regional preferences are independent concepts in MetaLayer.

## Configure UI

- Toolkit: `i18next` + `react-i18next` (`apps/frontend/src/lib/i18n.ts`)
- Catalogs: `packages/i18n/locales/{en-US,pt-BR,es-ES}/` (+ `en-XA` / `ar-XB` pseudo)
- Document `lang` / `dir` via `applyDocumentLocale` (`@metalayer/i18n`)
- Validation: `pnpm i18n:check` / `pnpm i18n:pseudo`

Stable locales for `1.0.0`: **en-US**, **pt-BR**, **es-ES**.

## Related docs

| Topic | Doc |
|---|---|
| Language & Region UX / API | `docs/language-region.md` |
| Field locale resolution | `docs/field-resolution-chains.md` |
| Product rules (BCP 47, fallbacks, RTL readiness) | `AGENTS.md` §9 |
| Contributor translation workflow | `docs/translation-guide.md` |

## RTL note (Phase M)

Configure sets `dir=rtl` for `ar-XB`. Prefer CSS logical properties (`ps-*`, `ms-*`, `border-s`). Dashboard Updates list uses `ps-5` for indentation. A full visual layout audit under pseudo-locales remains a Phase M follow-up.

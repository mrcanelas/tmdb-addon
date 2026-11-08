# Translation guide

For contributors adding or changing user-facing copy in MetaLayer.

## Checklist (every PR with UI text)

1. Add an `en-US` key under the correct namespace in `packages/i18n/locales/en-US/`.
2. Do not hard-code user-facing English in React components.
3. Update `pt-BR` (and `es-ES` when the stable set is required).
4. Preserve `{{placeholders}}` identically across locales.
5. Prefer full message templates over concatenating translated fragments.
6. Run `pnpm i18n:check` (and `pnpm i18n:pseudo` when adding keys so QA locales stay in sync).

## Keys

Use semantic keys:

```ts
t('catalog.actions.create')
t('errors.SOURCE_CREDENTIAL_MISSING', { source: 'TMDB' })
```

Do not use English sentences as keys. Do not translate registered brand names (TMDB, Trakt, AniList, …) unless the provider supplies an official localized brand.

## Namespace layout

Split catalogs by domain (`common`, `sources`, `catalogs`, `rules`, `resolution`, `searchAi`, …). See `packages/i18n/locales/` and `AGENTS.md` §9.7–§9.23.

Machine translation may assist drafts; mark translations complete only after human review for stable locales.

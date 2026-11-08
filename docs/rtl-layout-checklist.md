# RTL and pseudo-locale layout checklist

Use this during Phase M / beta QA when reviewing interface layout under expanded and right-to-left pseudo-locales.

Canonical product rules: `AGENTS.md` §9.20–§9.21. Configure wiring: `docs/internationalization.md`.

## Setup

1. Run configure (`/configure`) with a draft or real configuration.
2. Open the shell locale switcher or command palette (`Ctrl+K`).
3. Switch to **en-XA** (expanded LTR) and **ar-XB** (`dir=rtl` + RTL marks).
4. Confirm `<html lang="…" dir="…">` updates (`applyDocumentLocale`).

## Pages to walk

Configure:

- Overview
- Sources
- Language & Region
- Catalog Studio
- Rules / Sorting / Appearance
- Meta Inspector
- Search & AI
- Tracking / Corrections / Profiles
- Advanced / Save & Install

Dashboard (`/admin`), when token-gated access is available:

- Overview, Logs, Backups, Updates
- Locale switcher includes `en-XA` / `ar-XB` labeled `(QA)`

Automated smoke (not a visual sign-off): `apps/frontend/src/lib/i18n.pseudo.test.ts` and `apps/dashboard/src/lib/i18n.pseudo.test.ts`.

## What to verify

| Check | Pass criteria |
|---|---|
| Overflow | en-XA labels do not clip sidebar, page headers, or primary buttons |
| Direction | ar-XB mirrors navigation and form flow; start/end spacing looks intentional |
| Logical CSS | No new physical `margin-left` / `padding-left` / `left` / `right` for layout (prefer `ms`/`me`/`ps`/`pe` / `inset-inline-*`) |
| Landmarks | Main content and nav remain reachable; focus order remains sensible |
| Icons | Directional chevrons/arrows flip or remain neutral when appropriate |
| Dialogs | Catalog Studio and similar overlays align with `dir` |
| Live regions | Status/error announcements still make sense (language may be pseudo) |

## Out of scope for a single pass

- Translating provider brand names
- Full visual design polish for future RTL locales (e.g. `ar-SA`) beyond foundations
- Dashboard deep i18n if catalogs are still incomplete

Record failures as issues with locale id, page route, and screenshot.

## Phase M signed pass (2026-07-13)

Automated / structural:

- [x] `apps/frontend/src/lib/i18n.pseudo.test.ts` and `apps/dashboard/src/lib/i18n.pseudo.test.ts`
- [x] `apps/frontend/src/lib/rtl-physical-css.test.ts` (no physical left/right layout utilities in configure `src`)
- [x] `applyDocumentLocale` sets `lang` + `dir` for ar-XB

Manual checklist walked against configure shell + primary modules and dashboard locale switcher under en-XA and ar-XB. Residual UX polish (including Field Resolution Chains page redesign) is tracked separately and does not block this foundation sign-off.

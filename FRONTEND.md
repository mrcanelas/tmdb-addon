# MetaLayer Frontend — Master Guide

## Objective

Build and evolve the complete frontend for **MetaLayer**, a multilingual metadata orchestration platform for Stremio.

The product has two separate apps in this monorepo:

| App | Package | URL prefix | Audience |
|---|---|---|---|
| Configure | `@metalayer/frontend` (`apps/frontend`) | `/configure` | End users |
| Admin | `@metalayer/dashboard` (`apps/dashboard`) | `/admin` | Instance operators |

Shared visual primitives live in `@metalayer/shared-ui` (`packages/shared-ui`).

MetaLayer should feel like a premium metadata control center: modern, minimal, dark-first, technical, media-oriented and powerful without becoming chaotic.

Tagline:

> Your metadata. Your catalogs. Your way.

Authoritative product behavior remains in `AGENTS.md`. UI kit decision: **ADR 0007**. Bundler / two-app layout: **ADR 0002** (as amended). Instance settings / Admin-first secrets: **ADR 0008**.

---

## Technology stack

Use (aligned with the monorepo):

- React **19** + TypeScript
- **Rsbuild** (not Vite) for `apps/frontend` and `apps/dashboard`
- **HeroUI v3** (`@heroui/react` + `@heroui/styles`) as the only general-purpose component library
- **Tailwind CSS v4** (CSS-first imports)
- Lucide icons
- React Router (`basename` `/configure` or `/admin`)
- TanStack Query (target for data fetching)
- React Hook Form + Zod (target for forms)
- dnd-kit, Recharts, Sonner, date-fns (as features need them)
- i18next + react-i18next via `@metalayer/i18n`
- Zustand only for lightweight UI and draft state

Do not call `fetch` directly inside page components. Prefer a typed service layer (`src/lib/api.ts` today; expand toward `src/api/` + TanStack Query hooks).

Do not use Next.js / Remix for these apps.

## UI library policy

Use **HeroUI v3 as the only general-purpose component library**.

Use HeroUI primitives for buttons, inputs, selects, autocomplete, cards, chips, badges, tabs, accordions, dropdowns, popovers, tooltips, modals, drawers, tables, pagination, skeletons, progress, sliders, switches, radios, toolbars and alerts.

Prefer `@metalayer/shared-ui` re-exports (`Button`, `Modal`, `Tabs`, `Radio`, `RadioGroup`, `Toolbar`, …). Do not hand-roll equivalent controls with raw `<button>` / custom dialog markup when HeroUI already covers the pattern — customize later via tokens/slots if needed.

Use **Mantine UI only as visual and layout inspiration** for dashboard composition. Do not install Mantine packages.

Do not install shadcn/ui or Radix-based duplicates for components already covered by HeroUI.

Create MetaLayer-specific components in `@metalayer/shared-ui` (and app `components/metalayer/`) on top of HeroUI primitives.

```text
HeroUI primitive → MetaLayer component

Card → ProviderCard
Modal → CatalogMergeDialog
Drawer → MetaInspector / CatalogPreview / ProviderDiagnostics
Table → AdminDataTable
Input + Select → RuleBuilderRow
Tabs → InspectorTabs
List + Panel → ResolutionChainsPage (field rail + plan editor)
```

Study competitor layout patterns freely. Do **not** copy source, UI kit code, or GPL-licensed implementations (including AIOStreams).

---

## Design system

Visual direction: **Layered Minimalism**.

```text
70% minimal and flat
20% elevated surfaces
10% restrained glass
```

Flat opaque surfaces for dense/operational content (forms, tables, Catalog Studio, Resolution Chains, logs, diagnostics).

Glass only for floating/temporary UI (top nav, command palette, popovers, modals, drawers, Meta Inspector, unsaved-changes bar).

Dark-first tokens (owned by `@metalayer/shared-ui`):

```text
Background: #09090B
Surface: #111114
Elevated surface: #18181B
Border: #27272A
Primary text: #FAFAFA
Muted text: #A1A1AA
Accent: #7C5CFC
Success: #22C55E
Warning: #F59E0B
Error: #EF4444
Info: #3B82F6
```

Glass:

```text
Glass background: rgba(17, 17, 20, 0.78)
Glass border: rgba(255, 255, 255, 0.08)
Glass blur: 18px
```

Support light theme via semantic CSS variables. Customize HeroUI through tokens and MetaLayer wrappers — never ship unmodified default HeroUI appearance as the product look.

---

## Global application shell

Desktop (Configure and Admin):

```text
Sidebar | Main content | Optional inspector / detail panel (~340px)
```

Suggested widths: Sidebar 260px · Inspector 340px · Main fluid.

Canonical planning wireframes: `docs/ux-mocks/` (**v1 baseline** — see `docs/ux-mocks/DECISIONS.md`).

Do not cage the shell in a narrow `max-w-6xl` marketing column. Operational modules need full useful width with responsive gutters.

Mobile: navigation drawer/sheet, sticky Save / Install bar, accessible alternatives to drag-and-drop.

### Configure header

- configuration name (and optional profile);
- last-saved / unsaved status;
- Simple / Advanced toggle;
- command palette trigger;
- interface locale;
- theme;
- account / overflow menu (stub allowed until auth exists).

### Configure sidebar

- Fixed module nav (Simple subset vs full Advanced list).
- **Save & Install** separated (divider) and easy to reach.
- Footer: product version / health footprint (e.g. `1.0.0-beta.1`).

### Inspector / drawer pattern

Use the optional third column (or mobile sheet) for:

| Module | Inspector content |
|---|---|
| Sources | Provider diagnostics (health, latency, test) — never plaintext secrets |
| Language & Region | Live metadata / formatting preview + effective locale order bridge |
| Catalog Studio | Selected **catalog definition** preview (not an editorial title library) |
| Rules | Estimate / explanation panel (when that mock ships) |
| Save & Install | Prefer sticky bottom bar for validate / save / install |

Dense tables stay opaque (no glass). Glass only for floating chrome (`FRONTEND.md` glass rules).

### Admin chrome

Visible **Admin** badge. Operator token gate. Instance version / health footprint in sidebar footer.

### Page checklist (planning)

| Page | Wireframe | React redesign |
|---|---|---|
| Overview | `configure-overview.html` | Gated |
| Sources | `configure-sources.html` | Gated |
| Language & Region | `configure-language-region.html` | Gated |
| Catalog Studio | `configure-catalog-studio.html` | Gated |
| Resolution Chains | `configure-resolution.html` | Gated (dedicated route) |
| Save & Install | `configure-save-install.html` | Gated |
| Rules | Deferred | — |

**Out until ADR:** editorial title grids (confidence / bulk re-resolve).

---

## Internationalization

Locales: `en-US`, `pt-BR`, `es-ES` (+ pseudo `en-XA` / `ar-XB` in `@metalayer/i18n`).

Semantic keys only (`t('catalog.actions.create')`). No hard-coded user-facing strings. RTL-ready foundations. Language and region are different settings (`AGENTS.md` §9).

---

## Routes

### Configuration (`apps/frontend`, basename `/configure`)

Primary IA: `docs/configure-navigation-contract.md`.

```text
/configure                   (Home)
/configure/sources           (+ /tracking, /search tabs)
/configure/catalogs          (+ /studio, /rules, /order)
/configure/metas             (+ /fields, /language, /appearance)
/configure/profiles          (Advanced)
/configure/review            (+ /inspector, /corrections, /diagnostics)
/configure/save-install
```

Legacy paths (`/catalog-studio`, `/language-region`, `/inspector`, …) redirect to the hubs above.


### Administration (`apps/dashboard`, basename `/admin`)

```text
/admin
/admin/overview
/admin/health
/admin/providers             (instance enablement + app secrets)
/admin/users
/admin/configurations
/admin/requests
/admin/errors
/admin/cache
/admin/database
/admin/workers
/admin/logs
/admin/security
/admin/backups
/admin/updates
/admin/settings              (Redis/Postgres/proxy/telemetry — Admin-first)
```

---

# CONFIGURATION APPLICATION

## Navigation

Canonical contract: `docs/configure-navigation-contract.md`.

Simple mode: Home, Sources, Catalogs, Metas, Save & Install.

Advanced mode: Home, Sources, Catalogs, Metas, Profiles, Review, Save & Install.

Former top-level modules (Tracking, Rules, Sorting, Appearance, Language & Region, Search & AI, Corrections, Inspector, Diagnostics/Advanced) live as tabs under the hubs. Field Resolution Chains remain in product docs; UI under Metas → Fields may still say Meta Builder.

## Module notes

| Hub / area | UI responsibility |
|---|---|
| Home | Health summary, next steps, legacy import |
| Sources | Providers; Tracking and Search & AI as tabs |
| Catalogs | Studio, Rules, Order (sorting) as tabs |
| Metas | Fields (FRC / Meta Builder), Language, Appearance |
| Profiles | Profile overrides (Advanced) |
| Review | Inspector, Corrections, Diagnostics/Advanced |
| Save & Install | Validation, revisions, manifest URL, install |

### Resolution Chains layout

Inspired by dense “category list + detail” configuration UIs (independent implementation):

```text
┌──────────────┬────────────────────────────────────┐
│ Field groups │ Selected field plan editor           │
│ title        │ strategy · providers · locales     │
│ overview     │ effective order · warnings · test  │
│ poster …     │ ← Prev                    Next →   │
└──────────────┴────────────────────────────────────┘
```

Left rail fields map from Stremio [meta responses](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md) onto `MetadataField` (e.g. `name`→title, `description`→overview, poster/background/logo, credits, videos/episode order).

Provider pickers list only providers enabled for the instance (`AGENTS.md` §8.1.1).

Key UX invariants:

- Never reveal stored secrets.
- AI proposals require confirmation + diff.
- Provider failure must not blank an entire page.
- Every page: skeleton, empty, partial error, full error, retry.
- Unconfigured instance providers never appear as selectable sources.

---

# ADMIN APPLICATION

Operator modules: Overview, Health, **Providers**, Users, Configurations, Requests, Errors, Cache, Database, Workers, Logs, Security, Backups, Updates, **Settings** (`AGENTS.md` §24).

Auth: `METALAYER_DASHBOARD_TOKEN` via `x-metalayer-dashboard-token` (see Phase L / ADR 0008).

## Admin-first instance configuration

Prefer the Admin UI over new environment variables for day-two operation:

- Providers: Fanart, Trakt/SIMKL/AniList/MAL OAuth **client** id/secret, optional instance TMDB key, enable/disable.
- Settings: Redis / Postgres URLs (after bootstrap), cache limits, TMDB proxy, telemetry, tracking-refresh scheduler.

Bootstrap-only env (encryption key, dashboard token, ports, public base URL) remains documented in `docs/deployment.md` and ADR 0008.

When a provider is not configured/enabled in Admin, Configure must not offer it.

---

## Shared components

Prefer `@metalayer/shared-ui` exports, then app-local `components/metalayer/`.

Target set: AppShell, Sidebar, CommandPalette, PageHeader, SectionCard, StatusBadge, ProviderCard, MetricCard, EmptyState, ErrorState, LoadingState, FormSection, UnsavedChangesBar, InspectorPanel, DataTable, ConfirmDialog, SecretField, LocaleSelect, CatalogCard, RuleBuilder, SortingBuilder, ResolutionChainBuilder, ResolutionFieldRail, StremioPreview, CodeViewer, JsonDiff, LogViewer.

---

## API layer

Talk to MetaLayer Fastify API (`apps/server`):

```text
/api/v1/configurations...
/api/v1/dashboard...
/api/v1/sources...
```

Suggested structure (target):

```text
apps/frontend/src/api/
apps/dashboard/src/api/
```

Use stable error codes from `@metalayer/api-errors` and translate with `t('errors.${code}')`.

---

## Project organization

```text
apps/frontend/          # /configure
apps/dashboard/         # /admin
packages/shared-ui/     # HeroUI wrappers + tokens
packages/i18n/          # locale catalogs
```

Feature folders inside each app as modules grow. Avoid giant page components.

Additional UI rules:

- do not combine HeroUI, Mantine and shadcn in the same product;
- do not ship unmodified default HeroUI styling as the brand;
- glass only for floating surfaces;
- dense operational areas stay opaque;
- status colors are semantic, not decorative.

---

## Implementation order

1. HeroUI v3 provider/styles, shared tokens, MetaLayer wrappers (foundation — current slice)
2. Routing basenames `/configure` and `/admin`
3. Shells + i18n
4. Typed API / Query layer
5. Configure modules (Overview → Save & Install), including **Resolution Chains** page
6. Admin Providers + Settings (Admin-first instance config)
7. Accessibility + responsive + visual consistency passes

UX mockups (planning artifacts) live under `docs/ux-mocks/` (**v1** shell + core pages + FRC wireframe). Decisions: `docs/ux-mocks/DECISIONS.md`. Open `docs/ux-mocks/index.html` before implementing the React shell redesign — AppShell/AppHeader work stays **gated** until that packet is accepted.

---

## Deliverables

- Configure and Admin SPAs on Rsbuild
- HeroUI v3 + Layered Minimalism via `@metalayer/shared-ui`
- Dark-first (light via tokens)
- i18n en-US / pt-BR / es-ES
- Resolution Chains dedicated Advanced module
- Admin-first instance provider settings (gated availability)
- README run instructions per app

Do not prioritize a marketing landing page before the applications themselves.

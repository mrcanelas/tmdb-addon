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

Authoritative product behavior remains in `AGENTS.md`. UI kit decision: **ADR 0007**. Bundler / two-app layout: **ADR 0002** (as amended).

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

Use HeroUI primitives for buttons, inputs, selects, autocomplete, cards, chips, badges, tabs, accordions, dropdowns, popovers, tooltips, modals, drawers, tables, pagination, skeletons, progress, sliders, switches and alerts.

Use **Mantine UI only as visual and layout inspiration** for dashboard composition. Do not install Mantine packages.

Do not install shadcn/ui or Radix-based duplicates for components already covered by HeroUI.

Create MetaLayer-specific components in `@metalayer/shared-ui` (and app `components/metalayer/`) on top of HeroUI primitives.

```text
HeroUI primitive → MetaLayer component

Card → ProviderCard
Modal → CatalogMergeDialog
Drawer → MetaInspector
Table → AdminDataTable
Input + Select → RuleBuilderRow
Tabs → InspectorTabs
```

---

## Design system

Visual direction: **Layered Minimalism**.

```text
70% minimal and flat
20% elevated surfaces
10% restrained glass
```

Flat opaque surfaces for dense/operational content (forms, tables, Catalog Studio, logs, diagnostics).

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

Desktop:

```text
Sidebar | Main content | Optional inspector panel
```

Suggested widths: Sidebar 260px · Inspector 340px · Main fluid.

Mobile: navigation drawer/sheet, sticky Save bar, accessible alternatives to drag-and-drop.

Global header (configure): logo, configuration name, Simple/Advanced toggle, command palette, locale, theme, user menu, unsaved status.

Admin apps show a visible Admin badge.

---

## Internationalization

Locales: `en-US`, `pt-BR`, `es-ES` (+ pseudo `en-XA` / `ar-XB` in `@metalayer/i18n`).

Semantic keys only (`t('catalog.actions.create')`). No hard-coded user-facing strings. RTL-ready foundations. Language and region are different settings (`AGENTS.md` §9).

---

## Routes

### Configuration (`apps/frontend`, basename `/configure`)

```text
/configure
/configure/onboarding
/configure/overview   (alias of /configure)
/configure/sources
/configure/language-region
/configure/catalogs          (Catalog Studio; may use /catalog-studio during alpha)
/configure/rules
/configure/sorting
/configure/appearance
/configure/search-ai
/configure/tracking
/configure/corrections
/configure/profiles
/configure/advanced
/configure/save-install
/configure/diagnostics
/configure/inspector
```

### Administration (`apps/dashboard`, basename `/admin`)

```text
/admin
/admin/overview
/admin/health
/admin/providers
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
/admin/settings
```

---

# CONFIGURATION APPLICATION

## Navigation

Advanced mode: Overview, Sources, Language & Region, Catalog Studio, Rules, Sorting, Appearance, Search & AI, Tracking, Corrections, Profiles, Advanced, Save & Install.

Simple mode: Overview, Sources, Language & Region, Catalog Studio, Rules, Appearance, Save & Install.

Secondary: Diagnostics, Documentation, Donate.

## Modules

Implement Catalog Studio, Rules, Sorting, Appearance, Search & AI, Tracking, Corrections, Profiles, Advanced, Save & Install, Diagnostics, Meta Inspector, revision history, onboarding, and command palette as described in product sections of the previous FRONTEND master prompt and `AGENTS.md` §§7–24 / §31.

Key UX invariants:

- Never reveal stored secrets.
- AI proposals require confirmation + diff.
- Provider failure must not blank an entire page.
- Every page: skeleton, empty, partial error, full error, retry.

---

# ADMIN APPLICATION

Operator modules: Overview, Health, Providers, Users, Configurations, Requests, Errors, Cache, Database, Workers, Logs, Security, Backups, Updates, Settings (`AGENTS.md` §24).

Auth: `METALAYER_DASHBOARD_TOKEN` via `x-metalayer-dashboard-token` (see Phase L).

---

## Shared components

Prefer `@metalayer/shared-ui` exports, then app-local `components/metalayer/`.

Target set: AppShell, Sidebar, CommandPalette, PageHeader, SectionCard, StatusBadge, ProviderCard, MetricCard, EmptyState, ErrorState, LoadingState, FormSection, UnsavedChangesBar, InspectorPanel, DataTable, ConfirmDialog, SecretField, LocaleSelect, CatalogCard, RuleBuilder, SortingBuilder, StremioPreview, CodeViewer, JsonDiff, LogViewer.

---

## API layer

Talk to MetaLayer Fastify API (`apps/server`):

```text
/api/v1/configurations...
/api/v1/dashboard...
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
5. Configure modules (Overview → Save & Install)
6. Admin modules
7. Accessibility + responsive + visual consistency passes

---

## Deliverables

- Configure and Admin SPAs on Rsbuild
- HeroUI v3 + Layered Minimalism via `@metalayer/shared-ui`
- Dark-first (light via tokens)
- i18n en-US / pt-BR / es-ES
- README run instructions per app

Do not prioritize a marketing landing page before the applications themselves.

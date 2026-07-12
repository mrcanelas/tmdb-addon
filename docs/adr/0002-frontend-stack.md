# ADR 0002: Frontend and UI stack for MetaLayer apps

- Status: Accepted
- Date: 2026-07-11
- Deciders: MetaLayer maintainers (explicit product choice)

## Context

MetaLayer needs two browser applications (`AGENTS.md` §26 / §31):

- end-user configuration UI (`apps/frontend`);
- operator dashboard (`apps/dashboard`).

Both must support Simple/Advanced modes, i18n (`en-US`, `pt-BR`, `es-ES`), RTL foundations, mobile-first layout, and Lite self-hosting where a static build can be served by the API container.

The legacy TMDB Addon UI lives under `configure/` (Vite + React). Maintainers judged that little of that UI will transfer cleanly to MetaLayer modules (Catalog Studio, Rules, Meta Inspector, profiles, etc.). The old UI remains a **behavior and migration reference**, not a code base to port.

## Decision

1. **Greenfield frontend:** MetaLayer configure and dashboard are built from scratch. Do **not** migrate the legacy Vite build or rewrite `configure/` in place.
2. **Configuration UI and operator dashboard** share the same stack:
   - React SPA
   - **Rsbuild** (Rspack) as the application build tool
   - React Router (library mode) for client routing
   - TypeScript
3. **UI kit:** formal **shadcn/ui** on top of Radix primitives + Tailwind CSS.
4. **i18n toolkit** as in `AGENTS.md` §9.6: `i18next` + `react-i18next`.
5. **Legacy `configure/`:** keep working for TMDB Addon compatibility mode until MetaLayer UI replaces it; no investment in Vite→Rsbuild migration of that tree.
6. **Tests:** Vitest for packages and UI unit/contract tests (independent of Rsbuild).
7. **Out of scope:** Next.js / Remix for these apps. Marketing/docs site may get a separate ADR later.

## Consequences

- Faster MetaLayer UX alignment with `AGENTS.md` modules without dragging legacy page structure.
- Higher short-term cost: screens and components are rewritten.
- Contract tests and legacy fixtures remain the bridge for behavior parity and import flows.
- Docker Lite still serves static Rsbuild output from the API process once apps exist.
- Shared `@metalayer/*` packages (config, i18n, identity) are the reuse layer — not the old React pages.

## Alternatives considered

- **Migrate legacy Vite build to Rsbuild:** rejected; little UI reuse expected.
- **Incremental rewrite inside `configure/`:** rejected; MetaLayer navigation and modules differ too much.
- **Next.js for configure/dashboard:** rejected for Lite SPA + API separation.
- **Different stacks for configure vs dashboard:** rejected.

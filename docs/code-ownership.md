# MetaLayer code ownership boundaries

This document defines package/app ownership for Phase A onward (`AGENTS.md` §26 / §40).

## Apps

| Path | Responsibility | Notes |
|---|---|---|
| `apps/configure` | End-user MetaLayer configuration UI | Greenfield Rsbuild + React + shadcn (ADR 0002). Not a port of `configure/`. |
| `apps/api` | MetaLayer HTTP API | Fastify + TypeScript (ADR 0004). Thin transport over `@metalayer/*`. |
| `apps/dashboard` | Operator dashboard | Reserved; not started. |
| `apps/worker` | Background jobs | Reserved; not started. |

## Packages

| Path | Responsibility |
|---|---|
| `packages/identity` | Manifest/product identity constants (not derived from package.json). |
| `packages/config` | Versioned MetaLayer config schema, legacy config parsing, Stremio response contracts. |
| `packages/i18n` | Locale registry, negotiation, message catalogs, pseudo-locales. |
| `packages/api-errors` | Stable management API error codes. |
| `packages/security` | Secret Vault crypto + edit-credential hashing (ADR 0005). |
| `packages/persistence` | SQLite configuration + vault storage for Lite. |
| `packages/database` | Future schema/migrations (scaffold only). |
| `packages/types` / `packages/utils` | Reserved shared packages — avoid catch-all growth. |

## Legacy (compatibility mode)

| Path | Responsibility |
|---|---|
| `addon/` | Current TMDB Addon Stremio runtime (Express CommonJS). |
| `configure/` | Legacy Vite configuration UI. Behavior reference only for MetaLayer UI. |

## Rules

1. Core/domain packages stay provider-neutral.
2. Provider HTTP/OAuth code belongs under `packages/providers/<name>/` when adapters land (Phase C).
3. Do not put secrets in URLs, Dockerfiles, or cache keys.
4. Public Stremio routes and config schemas are compatibility contracts — change via ADR + migration.
5. Prefer Conventional Commits and one primary purpose per PR (`AGENTS.md` §39).

GitHub review routing: see `.github/CODEOWNERS`.

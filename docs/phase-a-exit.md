# Phase A exit — Repository baseline

- Status: Complete
- Date: 2026-07-11
- Reference: `AGENTS.md` §37 Phase A

## Exit criterion

> legacy behavior is covered by contract tests.

Satisfied by fixtures + Vitest contracts under `tests/fixtures/legacy` and `tests/contracts`, plus package unit tests for identity, config, i18n, api-errors, providers, and `apps/api`.

## Task checklist

| Task | Evidence |
|---|---|
| Establish CI | `.github/workflows/ci.yml` — lint, typecheck, i18n, test, build (legacy + configure + api) |
| Test runner | Vitest (`npm run test`) |
| Legacy fixtures | `tests/fixtures/legacy/*` (config, secrets, Trakt/MDBList/RPDB/AI, manifest, catalog, meta) |
| Document current routes | `docs/routes.md` |
| Decouple manifest identity | `@metalayer/identity` + ADR 0001 |
| Versioned configuration schema | `@metalayer/config` (`configVersion: 1`) |
| Locale registry + negotiation | `@metalayer/i18n` |
| Translation namespaces | `common`, `sources` (+ pseudo `en-XA` / `ar-XB`) |
| Foundational UI strings (MetaLayer apps) | `apps/configure` uses i18n keys (legacy `configure/` intentionally not rewritten) |
| Structured API error codes | `@metalayer/api-errors` |
| Pseudo-locales | `npm run i18n:pseudo` + catalogs |
| ADR process | `docs/adr/0000`–`0004` |
| Code ownership boundaries | `docs/code-ownership.md` + `.github/CODEOWNERS` |
| Greenfield configure scaffold | `apps/configure` (Rsbuild + shadcn) |
| Greenfield API scaffold | `apps/api` (Fastify) |

## Known legacy deviations recorded in contracts

`addon/lib/getCatalog.js` may return synthetic `tmdb:no-content` meta cards for empty/error page-1 results.

- Contract fixtures: `catalog-synthetic-empty.json`, `catalog-synthetic-error.json`
- MetaLayer target: `{ "metas": [] }` — enforced by `assertEmptyCatalogResponse` / `assertNotFakeErrorCatalog`

Phase B+ must not preserve synthetic error cards on native MetaLayer catalog routes.

## Explicitly out of Phase A (next phases)

- Persistent `/c/:configId` configuration and Secret Vault → **Phase B**
- Provider adapters with live HTTP → **Phase C**
- Catalog Studio / Rules / Resolver → **Phases D–F**

## Commands to verify exit

```bash
npm run lint
npm run typecheck
npm run i18n:check
npm run test
npm run build
npm run build:configure
npm run build:api
```

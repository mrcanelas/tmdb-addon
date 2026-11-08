# Architecture

MetaLayer is a modular monolith. Greenfield apps live under `apps/`; provider-neutral libraries under `packages/`.

## Runtime shape

| Surface | Path | Role |
|---|---|---|
| API + Stremio routes | `apps/server` | Fastify management API, native `/c/:configId/...`, legacy compatibility |
| Configure UI | `apps/frontend` | End-user configuration (`/configure`) |
| Operator dashboard | `apps/dashboard` | Token-gated instance ops (`/admin`) |

Core packages include `config`, `providers`, `metadata-resolver`, `identity-graph`, `corrections`, `catalogs`, `rules`, `sorting`, `security`, `i18n`, `persistence`, `cache`, and `observability`.

Provider-specific code belongs in `packages/providers/*` adapters — not in core packages.

## Decisions

Architecture Decision Records: `docs/adr/`.

| ADR | Topic |
|---|---|
| 0001 | Manifest identity |
| 0003 / 0004 | TypeScript backend / Fastify |
| 0005 | Secret Vault |
| 0006 | Stremio public ID (IMDb default) |
| 0007 | HeroUI v3 configure/admin UI |

Normative product architecture: `AGENTS.md` §26–§30. Phase exits under `docs/phase-*-exit.md` record what shipped.

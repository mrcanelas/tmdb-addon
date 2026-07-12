# ADR 0003: Backend language — TypeScript

- Status: Accepted (language only; framework deferred)
- Date: 2026-07-11
- Deciders: MetaLayer maintainers (explicit product choice)

## Context

MetaLayer’s new API (`apps/server`), workers, and shared packages need a long-term language choice.

Goals that favor a typed backend:

- stable management API error codes and schemas;
- versioned configuration and migrations;
- provider capability contracts;
- observability (metrics, traces, structured logs) with typed event payloads;
- safer refactors across a large modular monolith.

The HTTP framework (Express vs Fastify vs Hono, etc.) is **not** chosen in this ADR.

The legacy `addon/` CommonJS JavaScript server remains until MetaLayer routes and persistence replace it.

## Decision

1. New MetaLayer backend code is written in **TypeScript**.
2. Shared packages used by API and UI prefer TypeScript source (as already started under `packages/`).
3. Framework, ORM, and telemetry vendor choices require follow-up ADRs.
4. Legacy `addon/**/*.js` is not bulk-converted; behavior is covered by fixtures/contract tests and reimplemented behind MetaLayer boundaries when each module is ready.

## Consequences

- One language across `@metalayer/*`, `apps/server`, and future workers.
- Stronger typing for config schemas, API errors, and telemetry fields.
- Build/typecheck becomes part of CI for backend packages (already partially true).
- Temporary dual runtime: JS legacy addon + TS MetaLayer packages/apps.

## Alternatives considered

- **Stay on JavaScript for the new API:** rejected; typing and contract safety matter at MetaLayer scale.
- **Choose framework now:** deferred by maintainer request.
- **Rewrite all of `addon/` to TypeScript in one pass:** rejected; too risky for legacy compatibility.

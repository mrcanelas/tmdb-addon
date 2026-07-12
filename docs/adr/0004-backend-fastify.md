# ADR 0004: Backend HTTP framework — Fastify

- Status: Accepted
- Date: 2026-07-11
- Deciders: MetaLayer maintainers (explicit product choice)

## Context

MetaLayer needs an HTTP layer for:

- native Stremio routes (`/c/:configId/...`);
- versioned management API (`/api/v1/...`);
- serving the Rsbuild configure/dashboard static builds in Lite mode;
- structured errors, validation, and observability (`AGENTS.md` §27, §29, §35).

Backend language is TypeScript (ADR 0003). Framework options compared:

- Express 5 (legacy addon + AIOStreams reference);
- Fastify;
- Hono.

AIOStreams uses Express 5 as a thin server over a TS core. That is a useful reference for shape (HTTP thin + domain packages), not a requirement to copy stack or code (`AGENTS.md` §3.3).

## Decision

1. New MetaLayer HTTP app (`apps/server`) uses **Fastify** on Node.js.
2. Domain logic stays in `@metalayer/*` packages; Fastify remains a thin transport/adapter layer.
3. Prefer Fastify JSON Schema (and/or Zod via official patterns) for request/response validation at the boundary.
4. Use Fastify hooks/plugins for correlation IDs, logging, rate limiting, and static asset serving.
5. Legacy `addon/` Express 4 continues until MetaLayer routes replace it; no bulk rewrite of legacy Express to Fastify.

## Consequences

- Stronger TypeScript + schema validation for management APIs and telemetry-friendly hooks.
- Slightly higher migration cost from Express middleware patterns used in `addon/`.
- Plugin ecosystem (rate-limit, static, under-pressure, etc.) must be chosen explicitly per need.
- Dual runtime during migration: Express legacy + Fastify MetaLayer until cutover.

## Alternatives considered

- **Express 5:** best continuity with legacy and AIOStreams; weaker built-in validation/typing. Rejected in favor of greenfield API quality.
- **Hono:** excellent DX and multi-runtime story; weaker default self-host middleware path for MetaLayer 1.0 Node containers. Rejected for now; may revisit for edge experiment later.

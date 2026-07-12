# Phase L exit checklist (Dashboard and deployment)

Status: **complete** — operator dashboard API/UI, observability (metrics/logs), secret-free backups, Lite/Server Docker paths, GHCR workflow, and documented deployment/upgrade tooling.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Operator dashboard | Done | `apps/dashboard` + `/api/v1/dashboard/*` |
| Logs | Done | Bounded redacted `BoundedLogBuffer` |
| Metrics | Done | `MetricsRegistry` + request hooks |
| Backups | Done | `POST /dashboard/backups` excludes secrets |
| MetaLayer Lite | Done | `docker/Dockerfile.lite` + compose |
| MetaLayer Server | Done | `docker/Dockerfile.server` + Redis compose |
| Docker | Done | Lite/Server Dockerfiles |
| GHCR | Done | `.github/workflows/metalayer-docker.yml` |
| Hosted deployment | Documented | `docs/deployment.md` |
| Upgrade tooling | Done | `pnpm metalayer:upgrade-check` |

## Exit criterion (AGENTS.md §37 Phase L)

> personal and public deployment paths are documented.

Satisfied by `docs/deployment.md` and MetaLayer sections in `docs/self-hosting.md`.

## Out of scope (later)

- Full Postgres persistence for Server mode
- Redis-backed shared cache wiring end-to-end
- Hosted SaaS control plane

## Follow-ups completed after exit

- Serving configure/dashboard static assets from the API process (`@fastify/static` under `/configure` and `/admin`)

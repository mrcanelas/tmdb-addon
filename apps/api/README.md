# MetaLayer API (greenfield)

Fastify + TypeScript HTTP layer for MetaLayer (ADR 0004).

- Management API prefix: `/api/v1`
- Legacy Stremio addon remains in `/addon` until native `/c/:configId` routes land here

## Scripts

```bash
npm run dev:api
npm run build:api
npm run start:api
```

Default listen: `http://0.0.0.0:1338`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness / version |
| GET | `/api/v1/ping` | Cheap readiness probe |

Errors use `@metalayer/api-errors` with `x-correlation-id`.

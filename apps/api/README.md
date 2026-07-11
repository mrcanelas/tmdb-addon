# MetaLayer API (greenfield)

Fastify + TypeScript HTTP layer for MetaLayer (ADR 0004, ADR 0005).

## Scripts

```bash
npm run dev:api
npm run build:api
npm run start:api
```

Requires `METALAYER_ENCRYPTION_KEY` (32-byte base64 or hex).  
Optional `METALAYER_SQLITE_PATH` (default in-memory if unset/empty for safety in tests; set `./data/metalayer.sqlite` for Lite).

Default listen: `http://0.0.0.0:1338`

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness / version |
| GET | `/api/v1/ping` | Cheap probe |
| POST | `/api/v1/configurations` | Create persistent config + vault secrets |
| POST | `/api/v1/configurations/import-legacy` | Import TMDB Addon config (`dryRun` supported) |
| PUT | `/api/v1/configurations/:configId` | Update config (creates a revision) |
| GET | `/api/v1/configurations/:configId/revisions` | List revision history |
| GET | `/api/v1/configurations/:configId/revisions/:revisionId` | Read a revision snapshot |
| POST | `/api/v1/configurations/:configId/revisions/:revisionId/restore` | Restore a revision |
| GET | `/api/v1/configurations/:configId/export` | Safe export (no secret plaintext) |
| GET | `/c/:configId/manifest.json` | Native MetaLayer manifest (no secrets in URL) |

Secrets are stored encrypted (AES-256-GCM) and returned only as states (`connected`).

Request logs redact `editCredential`, vault `secrets`, and sensitive headers (`Authorization`, `X-MetaLayer-Edit-Credential`).
Internal error responses never echo raw exception messages to clients.

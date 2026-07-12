# MetaLayer Server (greenfield)

Fastify + TypeScript HTTP layer for MetaLayer (ADR 0004, ADR 0005).

Package name: `@metalayer/server` (pnpm filter: `server`).

## Scripts

```bash
pnpm dev
pnpm -F server dev
pnpm build:server
pnpm start:server
```

From the repo root, `pnpm dev` runs `core`, `server`, and `frontend` in parallel.

Requires `METALAYER_ENCRYPTION_KEY` (32-byte base64 or hex) in the root `.env` (see `.env.example`).  
In local development, if the key is missing, the API creates a durable key at `data/.metalayer-dev-encryption-key` (gitignored) and continues with a warning. Production still requires an explicit env value.

Optional `METALAYER_SQLITE_PATH` (defaults to `./data/metalayer.sqlite` when started via `src/index.ts`).

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
| GET | `/api/v1/sources` | List provider capability registry |
| GET | `/api/v1/sources/:providerId` | Provider details + locale example |
| POST | `/api/v1/sources/:providerId/test` | Ping provider (apiKey, env, or vault) |
| GET | `/api/v1/preview/movie/:id` | Cached movie preview (`tt…` / `tmdb:` / bare id) |
| GET | `/api/v1/preview/rating/:imdbId` | Cached IMDb rating preview |
| GET | `/api/v1/cache/stats` | Provider cache stats |
| GET | `/c/:configId/manifest.json` | Native MetaLayer manifest (no secrets in URL) |
| GET | `/configure/` | End-user configure SPA (from `apps/frontend/dist`) |
| GET | `/admin/` | Operator dashboard SPA (from `apps/dashboard/dist`) |
| GET | `/` | Redirects to `/configure/` |

SPA roots default to the monorepo dist folders. Override with `METALAYER_CONFIGURE_DIST` / `METALAYER_ADMIN_DIST`. If a dist is missing, those routes return a short HTML 503 with build instructions.

Secrets are stored encrypted (AES-256-GCM) and returned only as states (`connected`).

Request logs redact `editCredential`, vault `secrets`, and sensitive headers (`Authorization`, `X-MetaLayer-Edit-Credential`).
Internal error responses never echo raw exception messages to clients.

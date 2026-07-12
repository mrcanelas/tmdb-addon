# MetaLayer deployment

MetaLayer supports two deployment profiles.

## MetaLayer Lite (personal / family)

```text
Single container
SQLite
Memory cache
Optional Redis later
Built-in API process
Automatic local migrations (config store)
```

### Quick start

1. Set secrets in `.env` (never commit real values):

```bash
METALAYER_ENCRYPTION_KEY=<32-byte base64>
METALAYER_DASHBOARD_TOKEN=<long random token>
METALAYER_API_PORT=1338
METALAYER_SQLITE_PATH=./data/metalayer.sqlite
METALAYER_TELEMETRY_ENABLED=false
```

2. Run with Compose:

```bash
docker compose -f docker/docker-compose.lite.yml up -d --build
```

3. Open:

- API health: `http://localhost:1338/api/v1/health`
- Configure UI (dev): `pnpm -F @metalayer/frontend dev`
- Dashboard (dev): `pnpm -F @metalayer/dashboard dev`

## MetaLayer Server (public / multi-user)

```text
API container
Redis sidecar
Postgres planned
Operator dashboard token required
Rate limiting / horizontal scaling later
```

```bash
docker compose -f docker/docker-compose.server.yml up -d --build
```

Alpha persistence remains SQLite until Server Postgres migrations ship. Redis is provisioned for the Server profile.

## GHCR images

Workflow: `.github/workflows/metalayer-docker.yml`

Tags:

```text
ghcr.io/<owner>/metalayer-lite:<version>
ghcr.io/<owner>/metalayer-server:<version>
```

Trigger with tag `metalayer-v1.0.0-alpha.1` or workflow dispatch.

## Operator dashboard

Protect with `METALAYER_DASHBOARD_TOKEN`.

```http
GET /api/v1/dashboard/overview
x-metalayer-dashboard-token: <token>
```

Modules exposed: overview, health, metrics, logs, configurations, settings, backups, updates.

## Upgrades

```bash
pnpm metalayer:upgrade-check
```

Always:

1. Create a dashboard backup (secrets excluded).
2. Preserve `METALAYER_ENCRYPTION_KEY`.
3. Rebuild/restart containers.
4. Verify `/api/v1/health` and dashboard overview.

## Security notes

- Do not bake encryption keys or dashboard tokens into Docker images.
- Telemetry stays off unless `METALAYER_TELEMETRY_ENABLED=true`.
- Default backups never include vault plaintext.

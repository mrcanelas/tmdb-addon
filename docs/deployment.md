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
- Configure UI: `http://localhost:1338/configure/`
- Admin UI: `http://localhost:1338/admin/`

For hot-reload UI development:

```bash
pnpm -F @metalayer/frontend build   # once, if you want API to serve /configure
pnpm -F @metalayer/frontend dev     # http://localhost:5174/configure
pnpm -F @metalayer/dashboard dev    # http://localhost:5175/admin
```

The API serves built SPAs from `apps/frontend/dist` and `apps/dashboard/dist` (override with `METALAYER_CONFIGURE_DIST` / `METALAYER_ADMIN_DIST`).

## MetaLayer Server (public / multi-user)

```text
API container
Postgres configuration + vault store
Redis sidecar (provisioned; shared cache wiring follows)
Operator dashboard token required
Rate limiting / horizontal scaling later
```

```bash
docker compose -f docker/docker-compose.server.yml up -d --build
```

Set `POSTGRES_URL` (Compose sets it automatically) and `METALAYER_ENCRYPTION_KEY`. When `POSTGRES_URL` is present, the API uses `PostgresConfigurationStore` instead of SQLite. Lite remains SQLite via `METALAYER_SQLITE_PATH`.

When `REDIS_URL` is set, provider/identity caches use `RedisCache` (shared across instances). Without it, the API keeps an in-process `MemoryCache` (Lite default).

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
2. Preserve `METALAYER_ENCRYPTION_KEY` (or keep previous keys in `METALAYER_ENCRYPTION_PREVIOUS_KEYS` during a planned rotation).
3. Rebuild/restart containers.
4. Verify `/api/v1/health` and dashboard overview.

### Encryption key rotation

```bash
# 1. Generate a new 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. Set env (example: bumping 1 → 2)
# METALAYER_ENCRYPTION_KEY=<new>
# METALAYER_ENCRYPTION_KEY_VERSION=2
# METALAYER_ENCRYPTION_PREVIOUS_KEYS=1:<old>

# 3. Restart API, then dry-run and apply
pnpm metalayer:vault-reencrypt --dry-run
pnpm metalayer:vault-reencrypt

# 4. After zero failures, remove PREVIOUS_KEYS and restart again
```

Uses SQLite (`METALAYER_SQLITE_PATH`) or Postgres (`POSTGRES_URL`) automatically.

## Security notes

- Do not bake encryption keys or dashboard tokens into Docker images.
- Telemetry stays off unless `METALAYER_TELEMETRY_ENABLED=true`.
- Default backups never include vault plaintext.

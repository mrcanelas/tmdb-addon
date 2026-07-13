# MetaLayer deployment

MetaLayer supports two deployment profiles.

Canonical ops rules: `AGENTS.md` §24–§25. Admin-first instance config: ADR 0008 / `docs/dashboard.md`.

## Bootstrap vs Admin-managed

**Goal:** minimize day-two `.env` editing. Prefer `/admin` Providers + Settings after first boot.

| Class | Examples | Where |
|---|---|---|
| Bootstrap / sovereignty | `METALAYER_ENCRYPTION_KEY` (+ ring), `METALAYER_DASHBOARD_TOKEN`, `METALAYER_API_PORT` / public base URL / `HOST_NAME`, first-boot `METALAYER_SQLITE_PATH` | Environment only |
| Instance (Admin target) | Trakt/SIMKL/AniList/MAL client id+secret, Fanart API key, optional instance TMDB key, `REDIS_URL`, `POSTGRES_URL`, TMDB proxy, cache limits, telemetry / tracking-refresh flags | Dashboard + vault (env still accepted as defaults until UI ships fully) |
| Per-config | User API keys, user OAuth tokens, catalogs, rules, resolution | `/configure` |

Until Admin Providers/Settings APIs land, existing env vars remain the practical way to supply instance credentials. New work must not *require* additional env vars when an Admin setting can host them.

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

1. Set **bootstrap** secrets in `.env` (never commit real values):

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

4. (Target) In Admin → Providers / Settings, enable providers and paste instance secrets (Trakt client id/secret, Fanart, Redis, …) so Configure only offers available sources.

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

Set `POSTGRES_URL` (Compose sets it automatically) and `METALAYER_ENCRYPTION_KEY`. When `POSTGRES_URL` is present, the API uses `PostgresConfigurationStore` instead of SQLite. Lite remains SQLite via `METALAYER_SQLITE_PATH`. Moving `POSTGRES_URL` / `REDIS_URL` into Admin Settings remains the long-term target (restart-declared).

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

Modules: overview, health, metrics, logs, configurations, **providers**, **settings**, backups, updates — see `docs/dashboard.md`.

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

### Proactive tracking token refresh (Trakt / MAL)

Refresh OAuth access tokens before expiry so watchlist/history features stay connected without waiting for a 401.

```bash
# Dry-run (lists eligible configs; no provider calls in dry-run for skipped targets)
pnpm metalayer:tracking-refresh --dry-run

# Apply refresh
pnpm metalayer:tracking-refresh
```

**Cron example** (every 6 hours):

```cron
0 */6 * * * cd /path/to/metalayer && pnpm metalayer:tracking-refresh >> /var/log/metalayer-tracking-refresh.log 2>&1
```

**In-process scheduler** (single long-lived API container):

```bash
METALAYER_TRACKING_REFRESH_ENABLED=true
# optional; default 6h, minimum 60s
# METALAYER_TRACKING_REFRESH_INTERVAL_MS=21600000
```

Requires Trakt/MAL OAuth **client** credentials from Admin Providers (or env defaults until that UI lands). Never logs tokens or vault plaintext.

## Security notes

- Do not bake encryption keys or dashboard tokens into Docker images.
- Telemetry stays off unless `METALAYER_TELEMETRY_ENABLED=true`.
- Default backups never include vault plaintext.

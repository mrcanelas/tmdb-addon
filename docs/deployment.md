# MetaLayer deployment

MetaLayer supports two deployment profiles.

Canonical ops rules: `AGENTS.md` §24–§25. Admin-first instance config: ADR 0008 / `docs/dashboard.md`.

## Bootstrap vs Admin-managed

**Goal:** minimize day-two `.env` editing. Prefer `/admin` Providers + Settings after first boot.

| Class | Examples | Where |
|---|---|---|
| Bootstrap / sovereignty | Vault key ring, dashboard token, listen port, public base URL, trusted proxy addresses, SQLite path, `POSTGRES_URL` | Environment only |
| Instance | OAuth app credentials, provider API keys, `REDIS_URL`, catalog window and rate limits | Dashboard Providers or Settings, with environment fallback |
| Per-config | User API keys, user OAuth tokens, catalogs, rules, resolution | `/configure` |

Postgres stays in bootstrap for 1.0 because the server needs a connection before it can read the instance vault. Telemetry and tracking-refresh flags are managed through environment settings. The Dashboard exposes only settings with a runtime consumer as editable.

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
Redis shared cache
Operator dashboard token required
In-process rate limiting
```

```bash
docker compose -f docker/docker-compose.server.yml up -d --build
```

Set a URL-safe hex `METALAYER_POSTGRES_PASSWORD` in Compose's environment or `.env`. Existing Compose installations should supply their current database password before upgrading. Compose assembles `POSTGRES_URL` and starts Redis. Outside Compose, supply both service URLs. Production Server requires Postgres and Redis.

The Admin Settings Redis override is encrypted and takes effect on restart. During a rolling upgrade from RC.1, start one instance first to move legacy plaintext settings into the vault. Previous database snapshots can contain old plaintext settings and require the same protection as credentials. The archived Postgres and proxy values are not used to start the process.

## GHCR images

Workflow: `.github/workflows/metalayer-docker.yml`

Tags:

```text
ghcr.io/mrcanelas/metalayer-lite:<version>
ghcr.io/mrcanelas/metalayer-server:<version>
```

Use `METALAYER_IMAGE_TAG=<version>` with Compose and `up -d --no-build --pull always` to install a published tag. The release workflow validates the tagged commit and publishes both versioned images. Prereleases also advance their own channel. Advance `latest` after both stable images and the public instance pass smoke tests. See [release gates](./release-gates.md).

## Beamup

Use a separate Docker app such as `metalayer-staging-docker` on Beamup. The existing `beamup` remote in the original checkout is for TMDB Addon. Record the exact staging URL and Git remote provided by Beamup and push the validated RC SHA to that app's deployment branch from a separate checkout.

Configure external TLS-enabled Postgres and Redis services for the app. Set the vault key, the Dashboard token, `METALAYER_PUBLIC_BASE_URL` to the app's HTTPS origin, and `METALAYER_ADMIN_BASIC_AUTH=true`. The Server Dockerfile is at the repository root and the server listens on Beamup's `PORT` when supplied. Confirm proxy addresses with the host and set only those addresses in `METALAYER_TRUSTED_PROXIES`. Verify that direct connections and forged forwarding headers cannot bypass rate limits.

Test `/configure/`, `/api/v1/health` and a saved native manifest after a redeploy. Confirm unauthenticated `/admin/` returns 401 and that HTTPS Basic authentication works with username `operator` and the Dashboard token as the password. The Dashboard API continues to require its token. Check upstream cache behavior and access-log redaction before accepting legacy URLs or OAuth traffic.

For stable, prefer the validated GHCR Server digest. Where Beamup only exposes Git deployment, deploy a separate Docker project ref whose Dockerfile starts with `FROM ghcr.io/mrcanelas/metalayer-server@sha256:<validated-digest>`. Keep the last known-good ref and the matching vault key available for rollback. [Beamup deployment documentation](https://github.com/Stremio/stremio-beamup-cli)

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

1. Take a full database backup. Dashboard exports are for portable configuration.
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
- Instance backup and restore use `pnpm metalayer:backup --out ./backups` and `pnpm metalayer:restore --from <artifact>`. Stop Lite before copying its SQLite file and restore into an isolated path. For Postgres, use `pg_dump` and restore into a fresh database before switching traffic. Keep the vault key offline, separate from the backup. Verify a known manifest and vaulted credential before reopening traffic.


### Production build and beta images

`pnpm build` bundles server workspace TypeScript into `apps/server/dist`; third-party runtime dependencies remain installed. Verify with `pnpm test:production` using plain Node after building the interfaces. Docker prerelease tags update `alpha`, `beta` or `rc`, while only stable versions update `latest`. See `beta-readiness.md` for the CI and manual release gates.

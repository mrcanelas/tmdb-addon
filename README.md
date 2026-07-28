# MetaLayer

Your metadata. Your catalogs. Your way.

MetaLayer is the complete metadata orchestration layer for Stremio — the successor to the TMDB Addon for Stremio. It combines, resolves, filters, enriches, explains, and corrects metadata from multiple sources before delivering it to Stremio.

This repository is the MetaLayer monorepo. The npm root package name remains `tmdb-addon` during the migration test window; product identity is MetaLayer (`community.metalayer`).

## Architecture

| Surface | Location |
|---|---|
| API + Stremio routes | `apps/server` (default port `1338`) |
| Configure UI | `apps/frontend` → `/configure` |
| Admin dashboard | `apps/dashboard` → `/admin` |
| Shared packages | `packages/@metalayer/*` |
| Lite / Server images | `docker/` |

Native installs use:

```text
/c/:configId/manifest.json
/c/:configId/catalog/...
/c/:configId/meta/...
```

Legacy compressed TMDB Addon URLs (`/:catalogChoices/manifest.json`, catalog, meta) are served by the same MetaLayer server with the legacy manifest identity (`tmdb-addon` / `3.1.7`) so existing Stremio installs keep working during the migration window. Prefer importing into a native configuration (Overview → Import TMDB Addon config).

The old Express addon + Vite configure UI are archived on branch [`legacy/tmdb-addon-3.1.7`](https://github.com/mrcanelas/tmdb-addon/tree/legacy/tmdb-addon-3.1.7) and are no longer updated on this line.

## Quick start

```bash
pnpm install
pnpm dev
```

- API: `http://localhost:1338`
- Configure: `http://localhost:5174/configure` (Vite/Rsbuild frontend; production served from the API)
- Copy `.env.example` → `.env` and set `METALAYER_ENCRYPTION_KEY` for persistence (local dev can auto-generate a key under `data/`)

Useful scripts:

```bash
pnpm build          # frontend + server (+ dashboard when present)
pnpm test
pnpm typecheck
pnpm i18n:check
pnpm start          # MetaLayer server
```

## Docker

Use MetaLayer images under `docker/`:

```bash
# Lite (SQLite)
docker compose -f docker/docker-compose.lite.yml up

# Server (documented Postgres / Redis path)
docker compose -f docker/docker-compose.server.yml up
```

See `docs/deployment.md` and `docs/self-hosting.md`.

## Migration from TMDB Addon

1. Open Configure → Overview → **Import TMDB Addon config**.
2. Paste a legacy URL segment, compressed config, or JSON.
3. Review the import summary (secrets go to the Secret Vault).
4. Confirm → receive a native `/c/:configId/manifest.json` install URL.

Details: `docs/migration-from-tmdb-addon.md`, `AGENTS.md` §6.

## Documentation

- `AGENTS.md` — product and architecture authority
- `docs/architecture.md`
- `docs/routes.md`
- `docs/field-resolution-chains.md`
- `docs/language-region.md`
- `docs/deployment.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

## License

Apache-2.0

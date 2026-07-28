# Self-hosting

For MetaLayer Lite and Server deployments, follow:

- [Deployment](./deployment.md)
- Phase exit: [phase-l-exit.md](./phase-l-exit.md)

## Quick Lite path

```bash
# configure .env with METALAYER_ENCRYPTION_KEY and METALAYER_DASHBOARD_TOKEN
docker compose -f docker/docker-compose.lite.yml up -d --build
curl http://localhost:1338/api/v1/health
```

Configure UI is served at `/configure`; Admin at `/admin` when the dashboard dist is present.

## Legacy Express addon

The historical TMDB Addon Express self-hosting guides (Vercel, root `Dockerfile`, MongoDB, port 1337) live only on branch `legacy/tmdb-addon-3.1.7`. This branch runs MetaLayer exclusively.

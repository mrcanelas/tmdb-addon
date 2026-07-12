# MetaLayer operator dashboard

Greenfield Rsbuild + React 19 + HeroUI v3 UI for instance operators (`AGENTS.md` §24). Served under **`/admin`**.

This app is separate from the end-user configure UI (`apps/frontend`). Shared tokens/wrappers: `@metalayer/shared-ui` (ADR 0007).

## Develop

```bash
# terminal 1
pnpm -F @metalayer/server dev

# terminal 2
pnpm -F @metalayer/dashboard dev
```

Open http://localhost:5175/admin

Set `METALAYER_DASHBOARD_TOKEN` on the API, then paste the same token in the dashboard login gate.

## Modules (alpha)

- Overview / health
- Logs
- Backups (secret-free)
- Updates / upgrade notes

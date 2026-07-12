# MetaLayer operator dashboard

Greenfield Rsbuild + React UI for instance operators (`AGENTS.md` §24).

This app is separate from the end-user configure UI (`apps/frontend`).

## Develop

```bash
# terminal 1
pnpm -F @metalayer/server dev

# terminal 2
pnpm -F @metalayer/dashboard dev
```

Set `METALAYER_DASHBOARD_TOKEN` on the API, then paste the same token in the dashboard login gate.

## Modules (alpha)

- Overview / health
- Logs
- Backups (secret-free)
- Updates / upgrade notes

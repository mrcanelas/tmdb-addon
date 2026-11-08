# MetaLayer Frontend (configure)

End-user configuration UI for MetaLayer. Served under **`/configure`**.

Package: `@metalayer/frontend`

Stack (ADR 0002 + ADR 0007):

- React 19 + TypeScript
- Rsbuild
- React Router (`basename=/configure`)
- HeroUI v3 + Tailwind CSS v4 via `@metalayer/shared-ui`
- TanStack Query + React Hook Form + Zod (typed API via `@/api` / `@/lib/api`)
- Zustand for shell UI state (Simple/Advanced, theme, command palette)
- i18next / react-i18next via `@metalayer/i18n`

This app is **not** a port of the legacy `configure/` Vite UI. Product UX: `FRONTEND.md`.

## Scripts

```bash
pnpm -F @metalayer/frontend dev
pnpm -F @metalayer/frontend build
```

Dev server: http://localhost:5174/configure — proxies `/api` and `/c` to the MetaLayer API (`http://127.0.0.1:1338`).

Shell: Simple/Advanced nav filter, theme toggle, Ctrl+K command palette.

Optional: `PUBLIC_METALAYER_API_BASE` for a remote API.

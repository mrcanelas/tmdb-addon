# MetaLayer Configure (greenfield)

End-user configuration UI for MetaLayer.

Stack (ADR 0002):

- React + TypeScript
- Rsbuild
- React Router (library mode)
- shadcn/ui + Tailwind
- i18next / react-i18next via `@metalayer/i18n`

This app is **not** a port of the legacy `configure/` Vite UI.

## Scripts

```bash
npm run dev
npm run dev:configure
npm run build:configure
```

`npm run dev` (repo root) starts the MetaLayer API and this configure UI together.

Dev server defaults to http://localhost:5174 and proxies `/api` and `/c` to the MetaLayer API on `http://127.0.0.1:1338`.

Optional: `PUBLIC_METALAYER_API_BASE` for a remote API (otherwise same-origin / proxy).

Sources page loads `/api/v1/sources` and can run live provider tests via `/api/v1/sources/:id/test` (API key is sent only for that request and is not persisted in the UI).

Catalog Studio (`/catalog-studio`) creates a session draft configuration (edit credential in `sessionStorage`) and keeps studio order aligned with the projected manifest order via `/api/v1/configurations/:configId/catalogs`.

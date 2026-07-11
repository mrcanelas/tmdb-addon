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
npm run dev:configure
npm run build:configure
```

Dev server defaults to http://localhost:5174

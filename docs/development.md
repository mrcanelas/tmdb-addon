# Development Guide

## Prerequisites

- Node.js 22.13+ (required by pnpm 11 / `node:sqlite`)
- pnpm 11.x (see `packageManager` in root `package.json`)
- Git
- Basic knowledge of TypeScript and React

## Project structure

```text
tmdb-addon/   # monorepo root (package name retained during migration)
├── apps/
│   ├── server/      # Fastify API + Stremio routes
│   ├── frontend/    # Configure SPA
│   ├── dashboard/   # Admin SPA
│   └── worker/      # reserved
├── packages/        # @metalayer/* libraries
├── docker/          # Lite / Server images
├── docs/
├── scripts/
└── tests/
```

The Express addon + Vite configure UI are archived on `legacy/tmdb-addon-3.1.7`.

## Setup

```bash
git clone https://github.com/mrcanelas/tmdb-addon.git
cd tmdb-addon
pnpm install
cp .env.example .env
pnpm dev
```

- API: `http://localhost:1338`
- Frontend configure (dev): typically `http://localhost:5174/configure`

Generate an encryption key if needed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Core + server + frontend in parallel |
| `pnpm build` | Build MetaLayer apps |
| `pnpm test` | Vitest |
| `pnpm typecheck` | Workspace TypeScript |
| `pnpm i18n:check` | Locale validation |
| `pnpm start` | Start MetaLayer server |

## Docs

- `AGENTS.md` — product rules
- `FRONTEND.md` — configure UX
- `docs/architecture.md`
- `docs/routes.md`
- `CONTRIBUTING.md`

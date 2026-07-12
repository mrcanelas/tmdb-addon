# Legacy TMDB Addon image (production)

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/addon ./addon
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Secrets e configuração de runtime NÃO devem ser embutidos aqui.
# Use docker-compose env_file, -e, ou o secret store do orquestrador.
# Ver SECURITY.md e .env.example.

EXPOSE 1337

ENTRYPOINT ["node", "addon/server.js"]

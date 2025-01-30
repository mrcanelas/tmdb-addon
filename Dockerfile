# Etapa 1: Construção do frontend
FROM node:16 AS build-frontend

WORKDIR /app/frontend
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm install
COPY ./frontend ./
RUN npm run build

# Etapa 2: Servir o backend Express com a build do frontend
FROM node:16

WORKDIR /app/backend
COPY ./backend/package.json ./backend/package-lock.json ./
RUN npm install
COPY ./backend ./

# Copiar a build do frontend da etapa anterior
COPY --from=build-frontend /app/frontend/build /app/backend/frontend/build

# Expor a porta do servidor
EXPOSE 7000

# Comando para rodar o servidor
CMD ["node", "server.js"]

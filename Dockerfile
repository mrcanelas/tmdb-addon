# Etapa 1: Construção do frontend
FROM node:16 AS build-frontend

WORKDIR /app/configure
COPY ./configure/package.json ./configure/package-lock.json ./
RUN npm install
COPY ./configure ./
RUN npm run build

# Etapa 2: Servir o backend Express com a build do frontend
FROM node:16

WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY ./ ./

# Copiar a build do frontend da etapa anterior
COPY --from=build-configure /app/configure/build /app/configure/build

# Expor a porta do servidor
EXPOSE 7000

# Comando para rodar o servidor
CMD ["node", "server.js"]

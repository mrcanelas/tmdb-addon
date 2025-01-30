# Etapa 1: Construção do frontend
FROM node:16 AS build-frontend

WORKDIR /app/configure
COPY ./configure/package.json ./configure/package-lock.json ./
RUN npm install
COPY ./configure ./
RUN npm run build

# Verifique se a pasta dist foi criada corretamente
RUN ls -la /app/configure/dist

# Etapa 2: Servir o backend Express com a build do frontend
FROM node:16

WORKDIR /app

# Instalar dependências do backend
COPY ./package.json ./package-lock.json ./
RUN npm install

# Copiar o código do backend para o contêiner
COPY ./server.js ./

# Copiar a build do frontend da etapa anterior
COPY --from=build-frontend /app/configure/dist /app/configure/dist

# Expor a porta 7000
EXPOSE 7000

# Comando para rodar o servidor
CMD ["node", "server.js"]

# Etapa de construção do frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copia os arquivos de configuração primeiro
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código fonte
COPY . .

# Build da aplicação React
RUN npm run build

# Etapa de produção
FROM node:18-alpine AS runner

WORKDIR /app

# Copia apenas os arquivos necessários
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm install --production

# Copia os arquivos do servidor
COPY --from=builder /app/addon ./addon

# Copia os arquivos buildados do React
COPY --from=builder /app/dist ./dist

# Copia a pasta public com as imagens
COPY --from=builder /app/configure/public ./public

# Comando para iniciar o servidor
ENTRYPOINT ["node", "addon/server.js"]
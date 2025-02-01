# Etapa de construção do frontend
FROM node:18-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos necessários
COPY package.json package-lock.json ./ 

# Instala as dependências
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Copia o restante do código
COPY . .

# Compila o frontend
RUN pnpm run build

# Etapa de execução do backend
FROM node:18-alpine AS runner

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários para o backend
COPY --from=builder /app/addon /app/addon
COPY --from=builder /app/package.json ./ 
COPY --from=builder /app/package-lock.json ./ 

# Instala apenas as dependências de produção
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Copia os arquivos do frontend para serem servidos pelo backend
COPY --from=builder /app/dist /app/addon/static

# Exposição da porta do backend
EXPOSE 7000

# Inicia o servidor Express
CMD ["node", "addon/server.js"]

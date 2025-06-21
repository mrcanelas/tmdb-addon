# Build stage
FROM node:24.0.2-alpine AS builder

WORKDIR /app

# Copy package files first and install dependencies
# This creates a separate layer that will be cached unless package files change
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY addon/ ./addon/
COPY public/ ./public/
COPY configure/ ./configure/
COPY components.json ./
COPY now.json ./
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Build the application
RUN npm run build

# Production stage
FROM node:24.0.2-alpine AS runner

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy server files and built assets from builder stage
COPY --from=builder /app/addon ./addon
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Add build args for version information
ARG VERSION
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.description="TMDB Addon (Multi-architecture)"
LABEL org.opencontainers.image.source="https://github.com/aves-omni/tmdb-addon"

# Expose port
EXPOSE 1337

# Command to start the server
ENTRYPOINT ["node", "addon/server.js"]
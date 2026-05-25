# ---- Build frontend ----
FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Build server ----
FROM node:20-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# ---- Production image ----
FROM node:20-alpine AS production
WORKDIR /app

# Server runtime deps only
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built artifacts
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-client /app/client/dist ./client/dist

# Persistent data volume
RUN mkdir -p /app/data

EXPOSE 3001
CMD ["node", "server/dist/index.js"]

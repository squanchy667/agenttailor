# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY dashboard/package.json dashboard/
COPY landing/package.json landing/
COPY mcp-server/package.json mcp-server/
COPY extension/package.json extension/
RUN npm ci --ignore-scripts

# Stage 2: Build all packages
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=deps /app/landing/node_modules ./landing/node_modules
COPY --from=deps /app/mcp-server/node_modules ./mcp-server/node_modules
COPY . .
RUN npm run build -w shared && \
    npm run build -w server && \
    npm run build -w dashboard && \
    npm run build -w landing

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install production deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/dashboard/dist ./dashboard/dist
COPY --from=build /app/landing/dist ./landing/dist

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Create uploads directory
RUN mkdir -p server/uploads

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "server/dist/index.js"]

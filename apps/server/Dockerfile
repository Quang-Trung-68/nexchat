# chat-app — API + Prisma (monorepo workspace)
# Multi-stage: prisma generate → build shared packages → compile server TS → node dist/server.js

# ================================
# Stage 1: Builder
# ================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy all workspace package.json files for npm ci
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY packages/shared-constants/package.json packages/shared-constants/
COPY packages/shared-schemas/package.json packages/shared-schemas/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/

RUN npm ci

# Prisma client MUST be generated before shared-types (it re-exports enums from @prisma/client)
COPY apps/server/prisma apps/server/prisma
WORKDIR /app/apps/server
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
WORKDIR /app

# Copy shared packages source
COPY packages packages

# Build each shared package to dist/ (generates .js + .d.ts)
RUN cd packages/shared-constants && npx tsc --project tsconfig.json
RUN cd packages/shared-schemas   && npx tsc --project tsconfig.json
RUN cd packages/shared-types     && npx tsc --project tsconfig.json
RUN cd packages/shared-utils     && npx tsc --project tsconfig.json

# Patch shared package.json so server's tsc resolves compiled dist (not .ts source)
# This avoids rootDir violations when compiling apps/server
RUN node -e "['shared-constants','shared-schemas','shared-types','shared-utils'].forEach(function(p){var f=require('path').join('packages',p,'package.json');var j=JSON.parse(require('fs').readFileSync(f,'utf8'));j.main='dist/index.js';j.types='dist/index.d.ts';require('fs').writeFileSync(f,JSON.stringify(j,null,2));});"

# Copy full server source (src, prisma, …)
COPY apps/server apps/server

WORKDIR /app/apps/server

# Compile TypeScript → dist/
RUN npm run build

# ================================
# Stage 2: Runner
# ================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy the full built app (node_modules + compiled dist + prisma client)
COPY --from=builder /app ./

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/server.js"]

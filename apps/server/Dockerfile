# chat-app — API + Prisma (monorepo workspace)
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY packages/shared-constants/package.json packages/shared-constants/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-schemas/package.json packages/shared-schemas/

RUN npm install

COPY apps/server apps/server
COPY packages packages

WORKDIR /app/apps/server

ENV NODE_ENV=production
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

EXPOSE 5000

CMD ["npx", "tsx", "src/server.ts"]

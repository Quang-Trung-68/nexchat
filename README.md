# Fullstack Chat App

Production-grade realtime chat application built as an npm workspaces monorepo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript + Socket.IO |
| Database | PostgreSQL (via Prisma ORM) |
| Cache | Redis |
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| State | TanStack Query v5 + Zustand |
| Routing | React Router v6 |
| Monorepo | npm workspaces |

## Project Structure

```
├── apps/
│   ├── client/     # Vite + React frontend
│   └── server/     # Express + Socket.IO backend
├── packages/
│   ├── shared-types/      # DTO types
│   ├── shared-constants/  # Socket event names, enums
│   ├── shared-schemas/    # Zod schemas
│   └── shared-utils/      # Helper functions
└── infra/
    ├── docker/    # docker-compose.yml
    └── nginx/     # nginx.conf
```

## Getting Started

### 1. Start infrastructure (PostgreSQL + Redis)

```bash
cd infra/docker
docker-compose up -d
```

### 2. Setup server environment

```bash
cp apps/server/.env.example apps/server/.env
# Edit .env with your values
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma client

```bash
npm run db:generate --workspace=apps/server
```

### 5. Run development servers

```bash
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- Health check: http://localhost:5000/api/health

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client concurrently |
| `npm run dev:server` | Start only the backend |
| `npm run dev:client` | Start only the frontend |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all TypeScript files |
| `npm run db:migrate --workspace=apps/server` | Run Prisma migrations |
| `npm run db:generate --workspace=apps/server` | Generate Prisma client |
| `npm run db:seed --workspace=apps/server` | Seed the database |

## Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full 20-step implementation plan.

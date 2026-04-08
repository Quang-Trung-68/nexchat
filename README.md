# NexChat

> Production-grade real-time chat application with WebRTC voice calls, Web Push notifications, and a social feed — built as a full-stack TypeScript monorepo.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socketdotio)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-nexchat.io.vn-brightgreen)](https://nexchat.io.vn)

**Live Demo:** [nexchat.io.vn](https://nexchat.io.vn) &nbsp;·&nbsp; **GitHub:** [Quang-Trung-68/nexchat](https://github.com/Quang-Trung-68/nexchat)

---

## Features

- **Real-time messaging** — direct messages and group conversations, persisted to PostgreSQL
- **WebRTC voice calls** — peer-to-peer calls with TURN server (Metered) for reliable NAT traversal
- **Message interactions** — emoji reactions, threaded replies, pinned messages, and read receipts
- **Presence & typing indicators** — Redis-backed online status and per-conversation typing state
- **Web Push notifications** — VAPID push delivered to offline users via BullMQ background workers
- **Friend system** — send, accept, and manage friend requests with real-time socket updates
- **Message search** — room-scoped and global full-text search across conversation history
- **Social feed** — posts with multi-image support, likes, and comments with real-time updates
- **OAuth2 login** — Google and GitHub authentication via Passport.js
- **Email flows** — account verification and password reset via OTP codes

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js · Express · TypeScript · Socket.IO |
| **Database** | PostgreSQL 16 · Prisma ORM |
| **Cache & Queue** | Redis 7 · BullMQ |
| **Frontend** | React · Vite · TypeScript · Tailwind CSS v4 |
| **State management** | TanStack Query v5 · Zustand |
| **Auth** | Passport.js (Local, JWT, Google OAuth2, GitHub OAuth) |
| **Media** | Cloudinary · Multer |
| **Push notifications** | web-push (VAPID) |
| **Voice calls** | WebRTC · Metered TURN server |
| **DevOps** | Docker · GitHub Actions · GHCR · Nginx · VPS |

---

## Architecture

NexChat is an **npm workspaces monorepo** with four shared packages enforcing type-safe contracts between the React client and the Express/Socket.IO server.

```
nexchat/
├── apps/
│   ├── client/              # React + Vite frontend
│   └── server/              # Express + Socket.IO + Prisma backend
├── packages/
│   ├── shared-types/        # DTO interfaces & Prisma enum re-exports
│   ├── shared-constants/    # Socket event names, upload limits
│   ├── shared-schemas/      # Zod validation schemas
│   └── shared-utils/        # Shared helper functions
├── infra/
│   ├── docker/              # docker-compose.yml (dev: Postgres + Redis)
│   └── nginx/               # nginx.conf (dev reverse proxy)
├── scripts/                 # deploy.sh, redis-dev.sh
├── docker-compose.prod.yml  # Production 5-container stack
└── .github/workflows/       # CI/CD: lint → build → GHCR → VPS deploy
```

Background jobs run as a **dedicated worker process** (`apps/server/src/worker.ts`), consuming two BullMQ queues:
- `notify-message` — Web Push notifications for offline users, with automatic stale subscription cleanup
- `outbound-mail` — transactional email delivery with concurrency of 3

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full breakdown of the system design, real-time flows, and key decisions.

---

## Screenshots

> Visit the [live demo](https://nexchat.io.vn) to see NexChat in action.

<!-- Screenshots coming soon -->

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) & Docker Compose v2

### 1. Clone the repository

```bash
git clone https://github.com/Quang-Trung-68/nexchat.git
cd nexchat
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
cd infra/docker
docker compose up -d
cd ../..
```

### 3. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your values
```

Key variables to set:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `ACCESS_TOKEN_SECRET` | JWT signing secret (any long random string) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/) OAuth 2.0 credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | [GitHub Developer Settings](https://github.com/settings/developers) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | [Cloudinary Console](https://cloudinary.com/console) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail + [App Password](https://myaccount.google.com/apppasswords) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Generate with `npx web-push generate-vapid-keys` |
| `METERED_API_KEY` | [Metered.ca](https://www.metered.ca/) TURN server credentials |

### 4. Install dependencies

```bash
npm install
```

### 5. Run database migrations

```bash
npm run db:migrate --workspace=apps/server
```

### 6. Start development servers

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all TypeScript files |
| `npm run db:migrate --workspace=apps/server` | Run Prisma migrations |
| `npm run db:generate --workspace=apps/server` | Regenerate Prisma client |
| `npm run db:seed --workspace=apps/server` | Seed the database |

---

## Production Deployment

NexChat ships as a **5-container Docker stack** managed by `docker-compose.prod.yml`:

| Container | Role |
|---|---|
| `postgres` | PostgreSQL 16 database |
| `redis` | Redis 7 (BullMQ backing store · Socket.IO adapter · presence cache) |
| `chat-server` | Express API + Socket.IO |
| `chat-worker` | BullMQ consumers (push notifications + transactional mail) |
| `chat-client` | Nginx serving the compiled React SPA |

The GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) automatically:

1. Runs ESLint on critical source paths
2. Builds multi-stage Docker images and pushes them to GHCR
3. SSH-deploys to the VPS and runs `prisma migrate deploy` inside the container

See [`.env.deploy.template`](./.env.deploy.template) for the full list of production environment variables.

---

## Contributing

Contributions, issues, and feature requests are welcome. Please read [ARCHITECTURE.md](./ARCHITECTURE.md) before contributing to understand the system design.

---

## License

MIT © 2026 [Đặng Quang Trung](https://github.com/Quang-Trung-68)

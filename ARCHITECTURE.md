# NexChat — Architecture

This document describes the system architecture, real-time flows, background job design, and key engineering decisions behind NexChat.

---

## System Overview

NexChat is a **full-stack TypeScript monorepo** (npm workspaces). The client is a React SPA; the server is an Express + Socket.IO application backed by PostgreSQL and Redis. A separate worker process handles background jobs. All services run as Docker containers in production.

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
└───────────────┬────────────────────┬────────────────────┘
                │ HTTPS (REST)        │ WSS (/ws)
                ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│               Nginx (external shared proxy)              │
│   nexchat.io.vn → chat-client (SPA)                     │
│   api.nexchat.io.vn → chat-server :5000                 │
│   api.nexchat.io.vn/ws → chat-server :5000/ws (WS)      │
└──────────┬─────────────────────────────────────────────┘
           │
  ┌────────▼────────┐   BullMQ    ┌────────────────────┐
  │   chat-server   │ ──────────► │   chat-worker      │
  │ Express + WS    │             │ (push + mail jobs) │
  └────────┬────────┘             └────────────────────┘
           │                                │
    ┌──────▼──────┐              ┌──────────▼─────────┐
    │  PostgreSQL │              │       Redis        │
    │   (Prisma)  │              │ BullMQ · WS adapter│
    └─────────────┘              │ presence · typing  │
                                 └────────────────────┘
```

---

## Monorepo Structure

```
nexchat/
├── apps/
│   ├── client/           # React + Vite frontend (TypeScript)
│   └── server/           # Express + Socket.IO backend (TypeScript)
│       └── src/
│           ├── features/ # Domain modules (auth, rooms, messages, friends…)
│           ├── config/   # env, passport, redis, prisma
│           ├── lib/      # Prisma client, Redis client, BullMQ queues
│           └── worker.ts # BullMQ consumer entry point
├── packages/
│   ├── shared-types/     # DTO interfaces & Prisma enum re-exports
│   ├── shared-constants/ # Socket event names, upload limits, enums
│   ├── shared-schemas/   # Zod validation schemas
│   └── shared-utils/     # Shared helper functions
├── infra/
│   ├── docker/           # docker-compose.yml (dev: Postgres + Redis)
│   └── nginx/            # nginx.conf (dev reverse proxy)
├── docker-compose.prod.yml
└── .github/workflows/ci-cd.yml
```

**Shared packages** eliminate duplication and enforce type safety across the boundary between the React client and the Express server. For example, `SOCKET_EVENTS` from `@nexchat/shared-constants` is imported by both the server's socket handlers and the client's hooks — a typo in an event name is caught at compile time.

---

## Backend Layer Structure

Each feature domain follows a **4-layer architecture**:

```
Routes → Controllers → Services → Repositories (Prisma)
```

- **Routes** declare HTTP verbs, paths, and middleware chains (`authenticate`, `requireEmailVerified`, `validate`, rate limiters).
- **Controllers** extract inputs, call one service method, return the HTTP response.
- **Services** own business rules, coordinate across repositories, enqueue jobs.
- **Repositories** contain all Prisma queries. The service layer never calls Prisma directly.

Example domain: `features/messages/messages.routes.ts` → `messages.controller.ts` → `messages.service.ts` → `messages.repository.ts`.

---

## Authentication Flow

```
Login (local / OAuth callback)
     │
     ▼
Validate credentials → issue JWT access token (15m) + refresh token (7d)
Set as HttpOnly, Secure, SameSite=lax cookies
     │
     ▼
Subsequent REST requests → passport-jwt strategy
  ExtractJwt.fromExtractors([cookie, Bearer header])
     │
     ├── Valid → attach user to req, proceed
     └── Expired → frontend calls POST /api/auth/refresh
              │
              ▼
         Verify token exists in RefreshToken table
              │
              ▼
         Issue new token pair → rotate (revoke old refresh)
```

**Socket auth:** on Socket.IO handshake, the auth middleware extracts the JWT from `handshake.auth.token` → `Authorization: Bearer` → `accessToken` cookie. Email verification is checked before the connection is accepted.

**OAuth (Google, GitHub):** `authService.handleOAuthCallback` finds or creates the user, links the `OAuthAccount` record, and attaches `req.oauthTokens` so the callback route sets the same cookies as password login.

---

## Real-time Architecture (Socket.IO)

### Connection and Rooms

```
Client connects to /ws (WebSocket + polling transports)
     │
     ▼
socketAuth middleware: verify JWT → attach user
     │
     ▼
On connect:
  - join `user:{userId}` room (user-specific events)
  - join all `conversation:{id}` rooms the user participates in
  - update presence: SADD presence:sockets:{userId} {socketId}
```

### Message Delivery

```
Client emits CHAT_SEND { conversationId, content, type, parentId? }
     │
     ▼
chatHandlers.ts → messages.service.createMessage()
  - persist message to PostgreSQL
  - if type IMAGE: upload to Cloudinary, persist attachments
     │
     ▼
broadcast CHAT_NEW to conversation:{conversationId} room
     │
     ▼
For each offline participant:
  enqueue job → notify-message queue (BullMQ)
```

### Presence & Typing

- **Presence:** tracked as Redis sets (`SADD`/`SREM` on connect/disconnect). User is "online" if the set is non-empty (handles multiple tabs).
- **Typing:** `SETEX presence:typing:{conversationId}:{userId} 5 1` — auto-expires after 5 seconds. Client emits `TYPING_START` on keypress, `TYPING_STOP` on blur or submit.

### Horizontal Scaling

`@socket.io/redis-adapter` is configured when Redis is available (production). It publishes broadcasts to a Redis pub/sub channel, allowing multiple `chat-server` instances to deliver events to clients connected to any instance. In development (no Redis), the app falls back to the in-memory adapter automatically.

---

## WebRTC Call Flow

Voice calls use Socket.IO purely as a **signaling relay**. Media flows peer-to-peer.

```
Caller emits CALL_INITIATE { targetUserId, offer }
     │
     ▼
Server relays CALL_RINGING to target user's room
     │
     ▼
Target accepts → emits CALL_SIGNAL { answer }
Server relays CALL_SIGNAL to caller
     │
     ▼
ICE candidates exchanged via CALL_SIGNAL events
     │
     ▼
WebRTC connection established (peer-to-peer)
     │
     ▼
Either party emits CALL_END → server relays to other party
```

**TURN server:** the client fetches short-lived TURN credentials from `GET /api/webrtc/turn-credentials` (Metered.ca API) before initiating a call. This enables connections through symmetric NAT and corporate firewalls where direct P2P fails.

---

## Background Worker Architecture

The worker runs as a **separate Node.js process** (`apps/server/src/worker.ts`) and a **dedicated Docker container** (`chat-worker`) in production. This decouples background work from the HTTP/WebSocket server — a crash in the worker does not affect chat delivery.

### `notify-message` queue

Triggered when a new message, friend request, friend acceptance, or missed call occurs.

```
Job arrives in notify-message queue
     │
     ▼
notifyMessage.worker.ts
  Check user presence: SCARD presence:sockets:{userId}
     │
     ├── Online (> 0) → skip push (user will receive socket event)
     └── Offline (0) → fetch PushSubscription records for user
              │
              ▼
         Send Web Push via web-push (VAPID)
              │
              ├── Success → done
              └── 404 / 410 → delete stale subscription from DB
```

### `outbound-mail` queue

Handles all transactional emails (verification, password reset, etc.) with concurrency 3.

---

## Redis Usage Map

| Key pattern | Purpose | TTL |
|---|---|---|
| `presence:sockets:{userId}` | Set of active socket IDs | Cleared on disconnect |
| `presence:typing:{convId}:{userId}` | Typing indicator | 5 seconds (SETEX) |
| BullMQ internal keys | Job queues backing store | Managed by BullMQ |
| Socket.IO adapter keys | Cross-instance broadcast | Managed by adapter |

---

## Database Schema Highlights

The PostgreSQL schema (managed by Prisma) contains **19 models**. Key relationships:

- `User` → `Conversation` (via `ConversationParticipant`) → `Message` → `MessageAttachment`
- `Message` → `Reaction` (unique per user per emoji), `PinnedMessage`, `MessageRead`
- `User` ↔ `User` via `Friendship` (requester/addressee + status enum)
- `Notification` → delivered via socket + Web Push via worker
- `PushSubscription` → VAPID endpoint, p256dh, auth per browser
- `Post` → `PostImage`, `PostLike`, `PostComment`

All soft-deletable entities use `deletedAt DateTime?` to preserve foreign key integrity.

---

## CI/CD Pipeline

```
git push → main
     │
     ▼
GitHub Actions
  1. ESLint on critical paths
  2. Docker Buildx (multi-stage):
       build shared packages + server → push chat-server image to GHCR
       build SPA with VITE_* args → push chat-client image to GHCR
  3. SSH into VPS:
       git pull
       docker compose pull
       docker compose up -d (server + worker + client + postgres + redis)
       prisma migrate deploy (inside chat-server container)
```

---

## Key Design Decisions

**Why a separate worker container instead of in-process jobs?**
Separating the BullMQ worker into its own container means a spike in push/mail work doesn't block the Socket.IO event loop. It also enables independent scaling and restarts without dropping WebSocket connections.

**Why npm workspaces with shared packages instead of a simple two-folder repo?**
Shared TypeScript types and Zod schemas across the client/server boundary catch contract mismatches at compile time rather than at runtime. `SOCKET_EVENTS` constants eliminate magic strings in both the server handlers and the client hooks.

**Why Redis for presence instead of in-memory?**
An in-memory map is lost on server restart and doesn't work across multiple instances. Redis sets (`SADD`/`SREM`) persist across restarts and support the Socket.IO Redis adapter for horizontal scaling with no code changes.

**Why Cookie-based JWT over localStorage?**
HttpOnly cookies block JavaScript access, preventing XSS-based token theft. `SameSite: lax` provides CSRF protection for top-level navigation. An optional `COOKIE_DOMAIN` env var supports cross-subdomain sessions.

**Why Metered.ca for TURN instead of self-hosting?**
TURN servers require high bandwidth and separate network configuration. Metered.ca provides ephemeral credentials fetched per-call, which is simpler to operate and more cost-effective than running a dedicated Coturn server for a low-traffic application.

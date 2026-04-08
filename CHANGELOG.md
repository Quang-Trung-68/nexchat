# Changelog

All notable changes to NexChat are documented in this file.

Format: [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH — YYYY-MM-DD`

---

## v1.1.0 — 2026-04-07

### Added
- Production deployment on VPS: 5-container Docker stack (postgres, redis, chat-server, chat-worker, chat-client)
- GitHub Actions CI/CD pipeline: ESLint → Docker Buildx → push to GHCR → SSH deploy → `prisma migrate deploy`
- `chat-worker` as a dedicated Docker container (BullMQ consumers decoupled from the API server)
- `tsc-alias` for resolving `@/*` path aliases in compiled TypeScript output
- `TRUST_PROXY` env var support for correct IP detection behind Nginx

### Changed
- Docker multi-stage build: compiles shared packages before server to resolve workspace dependencies correctly
- Redis now required in production; server exits on startup if Redis is unreachable

---

## v1.0.0 — 2026-03-30

### Added
- npm workspaces monorepo with four shared TypeScript packages: `shared-types`, `shared-constants`, `shared-schemas`, `shared-utils`
- Express + Socket.IO server (TypeScript) with 4-layer architecture: Routes → Controllers → Services → Repositories
- **Real-time messaging** — direct messages and group conversations, persisted to PostgreSQL
- `ConversationParticipant` model with `lastReadAt` for per-user read receipts
- **Message features** — threaded replies (`parentId`), emoji reactions (unique per user per message), pinned messages, `MessageRead` table
- **Presence tracking** — Redis sets (`presence:sockets:{userId}`) updated on socket connect/disconnect
- **Typing indicators** — Redis `SETEX` with 5-second TTL, broadcast via `TYPING_START` / `TYPING_STOP` events
- `@socket.io/redis-adapter` for horizontal scaling of WebSocket connections across multiple server instances
- **BullMQ background workers** — `notify-message` queue (Web Push for offline users) and `outbound-mail` queue (transactional email, concurrency 3)
- **Web Push notifications (VAPID)** — `PushSubscription` model, stale subscription cleanup on 404/410 responses
- **WebRTC voice calls** — Socket.IO signaling relay (`CALL_SIGNAL`, `CALL_RINGING`, `CALL_END`), Metered.ca TURN credentials
- **Friend system** — `Friendship` model with `FriendshipStatus` enum, real-time friend request/accept notifications
- **Message search** — room-scoped and global search endpoints with dedicated repository
- **Social feed** — `Post`, `PostImage`, `PostLike`, `PostComment` models with real-time like/comment updates
- **In-app notifications** — `Notification` model, unread count endpoint, real-time `NOTIFICATION_NEW` socket event
- JWT authentication with HttpOnly cookies, refresh token rotation
- OAuth2 social login — Google and GitHub via Passport.js
- Email verification and OTP-based password reset (Nodemailer)
- Cloudinary image upload for avatars and chat images
- Configurable upload limits exposed via `GET /api/config/upload`
- Docker Compose development stack (Postgres 16 + Redis 7)

## Phase 1 — Core Foundation

**Bước 1 — Project setup & cấu trúc thư mục** ✅

Khởi tạo monorepo với hai workspace `apps/server` và `apps/client`. Backend: Node.js + Express + TypeScript; entry `apps/server/src/server.ts`. Cấu trúc thực tế:

- **`modules/auth/`** — đăng ký / đăng nhập / OAuth / refresh / forgot-password (Passport + JWT cookie).
- **`features/rooms/`**, **`features/messages/`**, **`features/sockets/`** — REST rooms/messages, Socket.IO realtime.
- **`middlewares/`**, **`config/`**, **`shared/`**.

Frontend: Vite + React + TypeScript (`apps/client`), Tailwind 4, TanStack Query, Zustand. Chạy `npm run dev` từ root.

---

**Bước 2 — Database schema (Prisma)** ✅

Schema PostgreSQL (`apps/server/prisma/schema.prisma`): **`User`**, **`Conversation`** (type DM | GROUP), **`ConversationParticipant`**, **`Message`** (reply qua `parentId`), **`MessageRead`**, **`Reaction`**, **`Friendship`**, **`Notification`**, **`OAuthAccount`**, **`RefreshToken`**, **`PasswordResetToken`**. Tên bảng/cột trong DB dùng **`snake_case`** (`@@map` / `@map`). Chưa có bảng `PinnedMessage` (dự kiến Bước 14).

---

**Bước 3 — Auth: Register/Login với JWT + HttpOnly cookie** ✅

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`. Cookie HttpOnly: `accessToken`, `refreshToken`; refresh token hash trong DB. Forgot/reset password (email). Middleware **`authenticate`** (Passport JWT đọc `accessToken` từ cookie).

---

**Bước 4 — OAuth: Google & GitHub** ✅

Passport strategies; callback set cookie như flow thường; bảng **`OAuthAccount`**. Routes: `/api/auth/google`, `/api/auth/github` (+ callback).

---

**Bước 5 — REST API: Rooms & Messages** ✅

Base URL: **`/api/rooms`**.

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/rooms` | Danh sách conversation user tham gia (participants, lastMessage, unreadCount, sort theo tin mới nhất). |
| POST | `/api/rooms` | Tạo nhóm GROUP (`name`, `participantIds`), transaction. |
| GET | `/api/rooms/:id/messages` | Lịch sử tin nhắn, cursor + limit, phân quyền participant. |
| POST | `/api/rooms/:id/messages` | Gửi tin (Zod: content và/hoặc file…). |

Layer: **routes → validation → controller → service → repository**; Prisma **`select`** có chủ đích. **Không** tạo DM qua POST (DM sau này khi accept friend).

---

## Phase 2 — Real-time & Messaging

**Bước 6 — Socket.IO server setup** ✅

Socket.IO gắn cùng `httpServer` với Express. Cấu hình thực tế:

- **`path: '/ws'`**, **`transports: ['websocket', 'polling']`**, CORS + `credentials`.
- Auth middleware: token theo thứ tự **`handshake.auth.token`** → **`Authorization: Bearer`** → **cookie `accessToken`**; verify JWT → **`socket.data.userId`**.
- Sau connect: join mọi **Socket.IO room** tên = **`conversationId`** (id trong DB), lấy từ `ConversationParticipant`.

Client: hook **`useSocket()`** (`withCredentials`, cùng path). **Vite** proxy **`/ws`** → backend với **`ws: true`**. Dev log `userId` + `socket.id`; production log tối thiểu.

Code: `apps/server/src/features/sockets/` (`socketServer.ts`, `socketAuth.middleware.ts`, `joinUserRooms.ts`, `socket.types.ts`).

---

**Bước 7 — Real-time messaging** ✅

- Client emit **`chat:send`** với payload gồm **`conversationId`** (CUID) và cùng field body với REST (`content` / `fileUrl` / `fileType` / `parentMessageId`, validate ít nhất content hoặc fileUrl).
- Server: **`messagesService.createMessage`** (một luồng với REST) → broadcast **`io.to(conversationId).emit('chat:new', { conversationId, message })`** — `message` cùng shape **MessageItemDto** như API.
- Lỗi chỉ cho socket gửi: **`chat:error`** `{ code, message }`; có thể dùng **ack** callback tùy chọn.
- Frontend: **`useChatRealtime(socket, connected)`** + Zustand **`useRealtimeMessagesStore`** (`byConversation`, append dedupe theo `id`); reset store khi logout. **`SocketBootstrap`** gọi chung một `useSocket()` (tránh hai kết nối).

---

**Bước 8 — Redis: Typing indicator & Presence**

Cài `ioredis` và `@socket.io/redis-adapter`. Typing indicator: client emit `typing:start`, server gọi `redis.setex('typing:conversationId:userId', 3, '1')` (TTL 3 giây), broadcast cho room. Presence: khi connect, `redis.sadd('online_users', userId)`; khi disconnect, `redis.srem`. Redis Adapter cho phép Socket.IO scale ngang nhiều server instance sau này.

---

**Bước 9 — Read receipts & Unread count**

Khi user mở một room, emit `room:read` với **`conversationId`**. Server cập nhật **`ConversationParticipant.lastReadAt`** (và/hoặc `MessageRead` tùy thiết kế). Unread đã dùng trong **GET /rooms**; có thể bổ sung broadcast **`receipt:read`** cho UI tick.

---

**Bước 10 — Frontend real-time client (hoàn thiện UI)**

Hook **`useSocket()`** đã có; **`chat:new`** đã đưa tin vào Zustand. Bước này mở rộng: TanStack Query làm initial fetch (rooms, history), merge với store realtime; lắng nghe thêm typing/presence khi có Bước 8–9. Pattern: Query = state server, Zustand = patch realtime.

---

## Phase 3 — Advanced Features

**Bước 11 — File & image upload**

Multer parse `multipart/form-data`, lưu file tạm vào memory (`memoryStorage`). Cloudinary SDK upload buffer lên cloud, trả về `secure_url`. Lưu URL vào cột `fileUrl` của bảng `Message` cùng `fileType` (image/video/document). Frontend hiển thị preview trước khi gửi, show progress bar trong lúc upload. Giới hạn size và mime type ở tầng Multer.

---

**Bước 12 — Emoji reactions**

Bảng `Reaction` gồm `messageId`, `userId`, `emoji`. Endpoint `POST /messages/:id/reactions` dùng `upsert` — nếu cùng emoji thì delete (toggle off), khác emoji thì update. Server broadcast `reaction:update` kèm toàn bộ reaction summary của message đó. Frontend group reactions theo emoji, hiển thị count và highlight nếu user đã react.

---

**Bước 13 — Reply & Thread**

Cột `parentId` trong `Message` — self-referencing FK. REST + **`chat:send`** đã hỗ trợ `parentMessageId`. Bổ sung UI thread / `GET /messages/:id/thread` nếu cần.

---

**Bước 14 — Pin message & Full-text search**

Pin: có thể thêm bảng `PinnedMessage` (`conversationId`, `messageId`, `pinnedBy`). Search: `pg_trgm` / full-text trên `content`, scope theo `conversationId`.

---

**Bước 15 — Push notifications**

BullMQ + Redis làm queue. Khi có message mới, enqueue job `notify:message`. Worker xử lý: lấy danh sách member offline (không có trong Redis `online_users`), gửi Web Push qua `web-push` library hoặc FCM payload. Frontend đăng ký service worker, lưu `PushSubscription` vào server. User nhận notification dù đang đóng tab.

---

## Phase 4 — Polish & Scale

**Bước 16 — Friend request system**

Bảng `Friendship` với `status`: PENDING | ACCEPTED | BLOCKED. `POST /friends/request`, `POST /friends/accept/:id`, `DELETE /friends/:id`. Khi accept, tự động tạo DM **Conversation** giữa hai người. Notification qua Socket và BullMQ push. Cần hoàn thành Phase 3 trước để có BullMQ infrastructure.

---

**Bước 17 — Infinite scroll history**

Cursor pagination đã có: `GET /rooms/:id/messages?cursor=…&limit=…`. TanStack Query `useInfiniteQuery` load thêm khi scroll lên trên. Preserve scroll position bằng `useLayoutEffect` — tính `scrollHeight` trước và sau khi prepend messages mới, bù offset để user không bị nhảy.

---

**Bước 18 — Rate limiting & Security**

`express-rate-limit` cho REST API (100 req/15 phút per IP). Redis-based rate limit cho Socket events (chống spam message). `helmet` cho security headers. Validate và sanitize tất cả input. Giới hạn file upload size. Log suspicious activity. Đây là bước quan trọng trước khi deploy production.

---

**Bước 19 — Mobile responsive UI**

Breakpoint strategy: mobile-first với Tailwind. Layout: sidebar ẩn trên mobile, slide-in từ trái. `BottomNav` với các tab chính. Touch targets tối thiểu 44px. Input font-size 16px để tránh iOS zoom. Safe area insets cho notch/home indicator. Test kỹ trên iOS Safari và Android Chrome.

---

**Bước 20 — VPS deployment**

Backend: PM2 với `ecosystem.config.js`, Nginx reverse proxy cho cả REST API và Socket.IO (`proxy_http_version 1.1`, `upgrade` và `connection` headers cho WebSocket; path **`/ws`** khớp client). Docker Compose cho PostgreSQL và Redis. Certbot SSL. Frontend: build Vite, serve static qua Nginx. CI đơn giản: push → pull trên server → `pm2 reload`.

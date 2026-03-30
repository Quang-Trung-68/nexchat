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

**Bước 8 — Redis: Typing indicator & Presence** ✅

- **Dependencies:** `ioredis`, `@socket.io/redis-adapter`. **`REDIS_URL`** (đã có trong `env`) — Redis **bắt buộc** khi chạy server; khởi động gọi `initRedis()` trước `initSocketServer`; lỗi kết nối → `process.exit(1)`. Dev: Redis trong `infra/docker/docker-compose.yml` (service `redis` port `6379`).
- **Adapter:** `attachRedisAdapter(io)` — pub/sub clients tách riêng (`duplicate()`); typing/presence dùng client Redis cache riêng (`getRedisCache()`).
- **Typing:** Client emit **`typing:start`** / **`typing:stop`** với `{ conversationId }` (Zod CUID). Server kiểm tra participant (cùng logic `messagesRepository.findParticipant`). **`SETEX`** key `typing:{conversationId}:{userId}` TTL **3s** (start); **`DEL`** key (stop). Broadcast **`socket.broadcast.to(conversationId)`** — **`typing:start`** / **`typing:stop`** payload `{ conversationId, userId }` (không gửi lại người gõ). Lỗi → **`chat:error`**.
- **Presence (multi-tab):** Key **`presence:user:{userId}`** — **`INCR`** khi socket connect (sau join room), **`DECR`** khi disconnect; chỉ broadcast **`presence:online`** khi counter **1 → lần đầu**; **`presence:offline`** khi **0** (và xóa key). **`io.emit`** toàn cục (global online/offline).
- **Client:** Zustand **`useTypingPresenceStore`**; hook **`useTypingPresenceRealtime`** (subscribe + log DEV); helper **`emitTypingStart` / `emitTypingStop`** (`typingPresenceSocket.ts`); reset khi logout. **`SocketBootstrap`** gọi thêm hook này cùng `useChatRealtime`.
- **Constants:** `packages/shared-constants/src/socket-events.ts` — **`SOCKET_EVENTS`** (`chat:*`, `typing:*`, `presence:*`).

Code: `apps/server/src/config/redis.ts`, `features/sockets/setupRedisAdapter.ts`, `typingPresence.handlers.ts`; client `features/sockets/` (`typingPresence.store.ts`, `useTypingPresenceRealtime.ts`, `typingPresenceSocket.ts`).

---

**Bước 9 — Read receipts & Unread count** ✅

- **Nguồn sự thật:** Chỉ cập nhật **`ConversationParticipant.lastReadAt`** (không ghi **`MessageRead`** per-message trong bước này). Giá trị: **`max(now, createdAt của tin nhắn mới nhất trong room)`** (nếu chưa có tin thì tương đương `now`).
- **REST:** **`PATCH /api/rooms/:id/read`** (auth), response `{ lastReadAt: ISO string }`. Sau khi ghi DB, **`io.to(conversationId).emit('receipt:read', { conversationId, userId, lastReadAt })`** — mọi socket trong room (kể cả người vừa đọc) để invalidate danh sách.
- **Socket:** Client emit **`room:read`** với **`{ conversationId }`** (Zod CUID, cùng schema typing). **`roomsService.markRoomAsRead`** → **`emitReceiptReadToRoom`** giống REST; có **ack** tùy chọn `{ ok: true, lastReadAt }` / lỗi qua **`chat:error`**.
- **Unread:** Vẫn từ **GET /rooms** (`countUnreadMessages` so với `lastReadAt`).
- **Client:** Query key **`roomsKeys.all`**; **`useRoomsQuery()`**; **`useReceiptRealtime`** — `invalidateQueries` khi nhận **`receipt:read`**; **`useRoomReadSync(socket, connected, conversationId)`** — debounce **300ms**, ưu tiên **`PATCH /read`**, fallback **`room:read`** + ack nếu PATCH lỗi; kích hoạt khi đổi room / **`chat:new`** trong room đang mở / **`window` focus**. **`SocketBootstrap`** gọi receipt + sync với **`conversationId: null`** cho tới khi có màn chat (Bước 10 truyền id thật).

Code: `rooms.repository` (`findLastMessageCreatedAt`, `updateParticipantLastReadAt`), `rooms.service` (`markRoomAsRead`), `rooms.controller` + route **`PATCH /:id/read`**, `receiptBroadcast.ts`, `roomRead.handlers.ts`; client `features/rooms/` (`rooms.keys`, `queries/rooms.queries`, `useReceiptRealtime`, `useRoomReadSync`).

---

**Bước 10 — Frontend real-time client (hoàn thiện UI)** ✅

- **Routing:** `/` → redirect `/chat`; **`/chat`**, **`/chat/:conversationId`** (protected). Không chọn room → màn welcome; chọn room → thread + panel phải (toggle).
- **TanStack Query:** **`useRoomsQuery`** (GET `/api/rooms`); **`useInfiniteQuery`** + **`fetchMessagesPage`** — **`useRoomMessagesInfinite`**, cursor `nextCursor`, **`fetchNextPage`** khi **scroll lên** gần đỉnh (ngưỡng ~80px). **`useMergedRoomMessages`** gộp trang infinite + Zustand **`useRealtimeMessagesStore`** (dedupe `id`, sort thời gian tăng).
- **Read:** **`useRoomReadSync`** chỉ gọi trong **`ChatThread`** (có `conversationId`); **`SocketBootstrap`** không còn `useRoomReadSync(null)`.
- **Gửi tin:** **`ChatComposer`** — ưu tiên **`chat:send`** + ack; lỗi → **`POST /api/rooms/:id/messages`**. Typing: **`emitTypingStart` / `emitTypingStop`** khi gõ.
- **UI (tham chiếu Zalo PC):** Cột 1 nav xanh đậm (`bg-sidebar`), cột 2 danh sách (tìm kiếm, tab **Tất cả / Chưa đọc**, badge unread, tạo nhóm, đăng xuất), cột 3 thread + composer + dòng typing, cột 4 **Thông tin hội thoại** (thành viên, nút placeholder). Nút gọi / upload / emoji: disabled + tooltip “Sắp có”.
- **Tạo nhóm:** **`GET /api/users`** (danh sách user trừ bản thân) + **`CreateGroupDialog`** → **`POST /api/rooms`**, redirect vào room mới.
- **Socket room sau membership mới:** **`conversation:join`** `{ conversationId }` — server kiểm tra participant rồi **`socket.join`**; client **`useJoinSocketRooms(rooms)`** khi danh sách room đổi (tạo nhóm / refetch), vì join lúc connect không bao gồm room tạo sau đó.
- **Realtime + sidebar:** `chat:new` → append Zustand + **`invalidateQueries(['rooms'])`** để preview / unread cập nhật ngay.
- **Sidebar:** badge đỏ **trước** timestamp; **in đậm** tiêu đề + preview khi `unreadCount > 0` và không phải room đang mở; thời gian **`formatSidebarTime`** (phút/giờ trước, hôm qua, dd/mm, dd/mm/yyyy).
- **Styling:** **Tailwind 4** + **shadcn/ui** (Radix + `class-variance-authority` + `cn`): component trong **`src/components/ui/`**; **chỉ** mở rộng **`index.css`** (`@theme` màu, `@plugin tailwindcss-animate`) — không thêm file CSS riêng cho màn chat.

Code: `features/chat/` (`pages/ChatPage`, `components/*`), `messages/api`, `queries/useRoomMessagesInfinite`, `hooks/useMergedRoomMessages`, `sockets/useJoinSocketRooms`; server `features/users/`, `conversationJoin.handlers.ts`.

---

## Phase 3 — Advanced Features

**Bước 11 — Ảnh chat (nhiều ảnh / một bubble) — đã triển khai (ảnh only; video/file sau)** ✅

- **Schema:** bảng **`message_attachments`** (`messageId`, `url`, `sortOrder`); `Message` giữ `fileUrl`/`fileType` cho tin legacy một file.
- **Config (không hardcode số trong code nghiệp vụ):** `packages/shared-constants/src/upload-defaults.ts` (`UPLOAD_DEFAULTS`); server đọc **`UPLOAD_MAX_IMAGES_PER_MESSAGE`**, **`UPLOAD_MAX_IMAGE_BYTES_PER_FILE`**, **`UPLOAD_MAX_IMAGE_DIMENSION_PX`** (fallback mặc định). Client lấy **`GET /api/config/upload`** (auth) để validate + nén.
- **Luồng:** preview ảnh trong RAM → **Gửi** → `POST /api/rooms/:id/messages` với `content?` + **`plannedImageCount`** (và `chat:send` cùng field) → **`POST /api/messages/:messageId/images`** (multipart `images[]`) → Cloudinary → ghi `MessageAttachment` → **`chat:message:updated`** toàn room.
- **Cloudinary:** `CLOUDINARY_*` trong `.env`; thiếu → upload trả 503. Upload **chỉ qua backend** (Multer `memoryStorage`).
- **Client:** nén nhẹ (`compressImageIfNeeded` + `maxImageDimensionPx`) trước multipart; lỗi upload → banner + **“Thử lại upload”** (tin chữ đã gửi). Bubble: chữ trên, lưới ảnh dưới.

Code: `apps/server/src/config/upload.config.ts`, `cloudinary.client.ts`, `features/messages/*`, `features/config/*`, `messageAttachments.routes.ts`, `chatMessageBroadcast.ts`; client `features/messages/api`, `features/config/uploadConfig.api.ts`, `lib/imageCompress.ts`, `ChatComposer.tsx`, `ChatThread.tsx`, `realtimeMessages.store` (upsert), `useChatRealtime` (`CHAT_MESSAGE_UPDATED`).

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

BullMQ + Redis làm queue. Khi có message mới, enqueue job `notify:message`. Worker xử lý: lấy danh sách member offline (không còn kết nối — có thể kiểm tra key **`presence:user:{userId}`** = 0 / không tồn tại, cùng mô hình Bước 8), gửi Web Push qua `web-push` library hoặc FCM payload. Frontend đăng ký service worker, lưu `PushSubscription` vào server. User nhận notification dù đang đóng tab.

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

## Phase 1 — Core Foundation

**Bước 1 — Project setup & cấu trúc thư mục**

Khởi tạo monorepo với hai workspace `apps/server` và `apps/client`. Backend dùng Node.js + Express + TypeScript theo cấu trúc feature-based (`src/features/auth/`, `src/features/rooms/`, `src/features/messages/`). Frontend dùng Vite + React + TypeScript. Cấu hình `tsconfig`, `eslint`, `prettier` chung ở root. Mục tiêu là có một project chạy được với `npm run dev` từ root.

**Bước 2 — Database schema (Prisma)**

Thiết kế toàn bộ schema PostgreSQL qua Prisma: `User`, `Room` (type: DM | GROUP), `RoomMember`, `Message` (có `parentId` cho reply), `Reaction`, `PinnedMessage`, `MessageRead`, `Friendship`. Chạy `prisma migrate dev` để tạo bảng. Đây là bước quan trọng nhất — schema đúng ngay từ đầu sẽ tránh refactor sau.

**Bước 3 — Auth: Register/Login với JWT + HttpOnly cookie**

Implement `POST /auth/register` và `POST /auth/login`. Password hash bằng `bcrypt`. Sau khi xác thực, server set hai cookie HttpOnly: `accessToken` (15 phút) và `refreshToken` (7 ngày). Cần có `POST /auth/refresh` để cấp access token mới khi hết hạn, và `POST /auth/logout` để clear cookie. Middleware `authenticate` dùng Passport JWT Strategy đọc token từ cookie.

**Bước 4 — OAuth: Google & GitHub**

Dùng `passport-google-oauth20` và `passport-github2`. Callback URL sau login OAuth sẽ tạo hoặc tìm user trong DB (upsert theo email), rồi set cookie giống flow thường. Có bảng `OAuthAccount` để một user liên kết nhiều provider. Frontend redirect sang `/auth/google`, backend xử lý toàn bộ flow.

**Bước 5 — REST API: Rooms & Messages**

Các endpoints cơ bản: `GET /rooms` (danh sách room của user), `POST /rooms` (tạo group), `GET /rooms/:id/messages` (lấy history, phân trang cursor), `POST /rooms/:id/messages` (gửi message qua HTTP). Validate input bằng Zod. Tất cả route đều cần `authenticate` middleware. Đây là fallback khi Socket chưa connect.

---

## Phase 2 — Real-time & Messaging

**Bước 6 — Socket.IO server setup**

Attach Socket.IO vào cùng HTTP server với Express: `const io = new Server(httpServer, { cors: ... })`. Viết auth middleware cho Socket: đọc cookie `accessToken`, verify JWT, gán `socket.data.userId`. Khi client connect, tự động join vào tất cả room mà user là member. Đây là nền tảng để mọi tính năng real-time hoạt động.

**Bước 7 — Real-time messaging**

Client emit `message:send` với `{ roomId, content }`. Server nhận, lưu vào PostgreSQL qua Prisma, rồi `io.to(roomId).emit('message:new', messageData)` để broadcast cho tất cả member trong room. Frontend lắng nghe `message:new` và append vào danh sách message hiện tại trong Zustand store mà không cần refetch API.

**Bước 8 — Redis: Typing indicator & Presence**

Cài `ioredis` và `@socket.io/redis-adapter`. Typing indicator: client emit `typing:start`, server gọi `redis.setex('typing:roomId:userId', 3, '1')` (TTL 3 giây), broadcast cho room. Presence: khi connect, `redis.sadd('online_users', userId)`; khi disconnect, `redis.srem`. Redis Adapter cho phép Socket.IO scale ngang nhiều server instance sau này.

**Bước 9 — Read receipts & Unread count**

Khi user mở một room, emit `room:read` với `roomId`. Server upsert bảng `MessageRead` (`userId`, `roomId`, `readAt`). Khi load danh sách room, query `unread_count` bằng cách đếm messages có `createdAt > readAt` của user đó. Broadcast `receipt:read` để người kia thấy tick xanh trong UI.

**Bước 10 — Frontend real-time client**

Khởi tạo socket trong một custom hook `useSocket()` — connect một lần, reuse toàn app. TanStack Query xử lý initial data fetch (history, danh sách room), Zustand store cập nhật khi có Socket event (`message:new`, `user:online`, `typing:start`). Pattern: Query = server state, Zustand = real-time patch lên trên server state đó.

---

## Phase 3 — Advanced Features

**Bước 11 — File & image upload**

Multer parse `multipart/form-data`, lưu file tạm vào memory (`memoryStorage`). Cloudinary SDK upload buffer lên cloud, trả về `secure_url`. Lưu URL vào cột `fileUrl` của bảng `Message` cùng `fileType` (image/video/document). Frontend hiển thị preview trước khi gửi, show progress bar trong lúc upload. Giới hạn size và mime type ở tầng Multer.

**Bước 12 — Emoji reactions**

Bảng `Reaction` gồm `messageId`, `userId`, `emoji`. Endpoint `POST /messages/:id/reactions` dùng `upsert` — nếu cùng emoji thì delete (toggle off), khác emoji thì update. Server broadcast `reaction:update` kèm toàn bộ reaction summary của message đó. Frontend group reactions theo emoji, hiển thị count và highlight nếu user đã react.

**Bước 13 — Reply & Thread**

Cột `parentMessageId` trong bảng `Message` — self-referencing FK. Khi gửi reply, client gửi kèm `parentMessageId`. Query message history join thêm parent để hiển thị preview tin nhắn được reply. Thread panel bên phải show tất cả reply của một message gốc — fetch riêng bằng `GET /messages/:id/thread`.

**Bước 14 — Pin message & Full-text search**

Pin: bảng `PinnedMessage` (`roomId`, `messageId`, `pinnedBy`). Hiển thị pinned messages ở top room. Search: enable extension `pg_trgm` trong PostgreSQL, tạo GIN index trên cột `content`. Query `WHERE content ILIKE '%keyword%'` hoặc dùng `to_tsvector` cho full-text. Scope search theo `roomId` để chỉ tìm trong room hiện tại.

**Bước 15 — Push notifications**

BullMQ + Redis làm queue. Khi có message mới, enqueue job `notify:message`. Worker xử lý: lấy danh sách member offline (không có trong Redis `online_users`), gửi Web Push qua `web-push` library hoặc FCM payload. Frontend đăng ký service worker, lưu `PushSubscription` vào server. User nhận notification dù đang đóng tab.

---

## Phase 4 — Polish & Scale

**Bước 16 — Friend request system**

Bảng `Friendship` với `status`: PENDING | ACCEPTED | BLOCKED. `POST /friends/request`, `POST /friends/accept/:id`, `DELETE /friends/:id`. Khi accept, tự động tạo DM room giữa hai người. Notification qua Socket và BullMQ push. Cần hoàn thành Phase 3 trước để có BullMQ infrastructure.

**Bước 17 — Infinite scroll history**

Cursor pagination: `GET /rooms/:id/messages?cursor=messageId&limit=30`. TanStack Query `useInfiniteQuery` load thêm khi scroll lên trên. Preserve scroll position bằng `useLayoutEffect` — tính `scrollHeight` trước và sau khi prepend messages mới, bù offset để user không bị nhảy. Reverse chronological order.

**Bước 18 — Rate limiting & Security**

`express-rate-limit` cho REST API (100 req/15 phút per IP). Redis-based rate limit cho Socket events (chống spam message). `helmet` cho security headers. Validate và sanitize tất cả input. Giới hạn file upload size. Log suspicious activity. Đây là bước quan trọng trước khi deploy production.

**Bước 19 — Mobile responsive UI**

Breakpoint strategy: mobile-first với Tailwind. Layout: sidebar ẩn trên mobile, slide-in từ trái. `BottomNav` với các tab chính. Touch targets tối thiểu 44px. Input font-size 16px để tránh iOS zoom. Safe area insets cho notch/home indicator. Test kỹ trên iOS Safari và Android Chrome.

**Bước 20 — VPS deployment**

Backend: PM2 với `ecosystem.config.js`, Nginx reverse proxy cho cả REST API và Socket.IO (`proxy_http_version 1.1`, `upgrade` và `connection` headers cho WebSocket). Docker Compose cho PostgreSQL và Redis. Certbot SSL. Frontend: build Vite, serve static qua Nginx. CI đơn giản: push → pull trên server → `pm2 reload`.
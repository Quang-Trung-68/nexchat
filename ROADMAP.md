## Phase 1 — Core Foundation

**Bước 1 — Project setup & cấu trúc thư mục** ✅

Khởi tạo monorepo với hai workspace `apps/server` và `apps/client`. Backend: Node.js + Express + TypeScript; entry `apps/server/src/server.ts`. Cấu trúc thực tế:

- **`modules/auth/`** — đăng ký / đăng nhập / OAuth / refresh / forgot-password (Passport + JWT cookie).
- **`features/rooms/`**, **`features/messages/`**, **`features/sockets/`** — REST rooms/messages, Socket.IO realtime.
- **`middlewares/`**, **`config/`**, **`shared/`**.

Frontend: Vite + React + TypeScript (`apps/client`), Tailwind 4, TanStack Query, Zustand. Chạy `npm run dev` từ root.

---

**Bước 2 — Database schema (Prisma)** ✅

Schema PostgreSQL (`apps/server/prisma/schema.prisma`): **`User`**, **`Conversation`** (type DM | GROUP), **`ConversationParticipant`**, **`Message`** (reply qua `parentId`), **`MessageRead`**, **`Reaction`**, **`PinnedMessage`**, **`Friendship`**, **`Notification`**, **`OAuthAccount`**, **`RefreshToken`**, **`PasswordResetToken`**. Tên bảng/cột trong DB dùng **`snake_case`** (`@@map` / `@map`).

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


**Bước 12 — Emoji reactions** ✅

- **Schema (Prisma):** bảng **`reactions`** — `messageId`, `userId`, `emoji`, `createdAt`. **`@@unique([messageId, userId])`** — một user một emoji / tin; migration `20260330180000_reaction_one_per_user_per_message`.
- **API:** **`POST /api/messages/:messageId/reactions`** — body `{ emoji }`; tập **`ALLOWED_REACTION_EMOJIS`** trong **`packages/shared-constants/reaction-emojis.ts`**. Toggle: cùng emoji → xóa; khác → cập nhật (cập nhật `createdAt` để sort tóm tắt theo mới nhất).
- **Realtime:** **`chat:reaction:updated`** (`SOCKET_EVENTS.CHAT_REACTION_UPDATED`) — **`reactionSummary`** + **`reactions: { userId, emoji }[]`**; client tính **`myReactionEmoji`** theo user đăng nhập.
- **Client:** **`MessageReactionHoverLayer`** góc dưới-phải bubble — pill tóm tắt + nút reaction cùng hàng **`h-7 w-7`**, nền trắng / viền nhạt (highlight nhẹ khi mình đã react), like mặc định xám; menu nhanh / lưới mở rộng neo nút; hàng action (Trả lời…) flex ngang cạnh bubble; **`applyReactionPatch`** (TanStack infinite + Zustand); **`useChatRealtime`** lắng nghe reaction.

Code: server `messageReactions.routes.ts`, `messageReactions.controller.ts`, `messages.service` (`setReaction`), `messages.repository`, `chatMessageBroadcast` (`emitReactionUpdated`); client `MessageReactions.tsx`, `reactions/applyReactionPatch.ts`, `useChatRealtime`, `messages.api` (`postMessageReaction`).

---

**Bước 13 — Reply & Thread** ✅

- **Backend:** `Message.parentId`; **`POST /api/rooms/:id/messages`** + **`chat:send`** với **`parentMessageId`**; mỗi tin trong list trả về **`parentPreview`** (snippet, ảnh đại diện, sender, `isDeleted`) khi có reply — join **`parent`** trong `messageListSelect`.
- **Client:** Nút **Trả lời** (hover trên bubble), quote phía trên nội dung, preview trong **ChatComposer**, gửi kèm **`parentMessageId`**; click quote → cuộn mượt tới tin cha; nếu tin cha chưa trong cache → **`fetchNextPage`** lặp (overlay + spinner) tới khi tìm thấy hoặc hết trang; fallback **`resolveParentPreview`** từ danh sách đã merge khi thiếu embed.
- **UX bổ sung:** focus ô nhập khi chọn hội thoại / Trả lời / sau khi gửi; **`ResizeObserver`** bám đáy khi ảnh tải xong; chip giữa màn hình khi có tin mới chỉ ảnh: **“{tên} đã gửi N ảnh”** + cuộn xuống khi bấm.
- **Chưa làm (tùy chọn):** **`GET /api/messages/:messageId/thread`** và panel thread kiểu Slack — không cần cho luồng quote inline.

---

**Bước 14 — Pin message & Full-text search**

- **Pin** ✅ — **`PinnedMessage`** (`messageId` unique, `conversationId`, `pinnedBy`, `pinnedAt`); migration `20260331034629_add_pinned_messages`; **`MAX_PINS_PER_CONVERSATION = 10`** (`@chat-app/shared-constants/pin-defaults.ts`). **REST:** `GET/POST /api/rooms/:id/pins`, `DELETE /api/rooms/:id/pins/:messageId` — mọi participant ghim/gỡ; thứ tự list **`pinnedAt` desc**; preview snippet / **Ảnh**; realtime **`room:pins:updated`**. **Client:** thanh ghim **sticky** đầu thread, nút **Ghim / Bỏ ghim** (hover cạnh Trả lời), panel phải danh sách + cuộn tới tin; **`useChatRealtime`** invalidate **`roomPins`**.
- **Search** ✅ — **`Message.content`**, substring **không phân biệt dấu** (PostgreSQL **`unaccent`** + **`position(unaccent(lower(...)))`**), chỉ tin **`content` không rỗng**. Migration `20260331120000_message_search_unaccent` bật extension **`unaccent`**, **`pg_trgm`** (index trên biểu thức `unaccent` bị bỏ do Postgres yêu cầu IMMUTABLE). **REST:** **`GET /api/search/messages?q=&cursor=&limit=`** (toàn bộ room user tham gia); **`GET /api/rooms/:id/messages/search?...`** (một room, kiểm tra participant). **`SEARCH_MESSAGES`** trong **`@chat-app/shared-constants/search-defaults.ts`** (độ dài tối thiểu 2, limit mặc định 15 / tối đa 20). **Rate limit:** `express-rate-limit` 40 req/phút cho cả hai nhóm route search. **Client:** **`ChatRoomList`** — ô **Tìm kiếm**, nút **Đóng**, tab **Tất cả / Liên hệ / Tin nhắn / File**, dropdown kết quả dưới tab; **`ChatThreadRoomSearchPanel`** — icon kính lúp trên header (trước panel phải), panel **Tìm kiếm trong trò chuyện** (ô tìm, lọc Người gửi/Ngày gửi placeholder, empty state / danh sách inline); highlight **`highlightSearchSnippet`**; click → **`navigate(..., { state: { focusMessageId } })`** + **`scrollToMessageInThread`** (load trang như reply/pin). Code: `messageSearch.repository.ts`, `messages.service` (`searchMessagesGlobal` / `searchMessagesInRoom`), `search.routes.ts`, `messageSearch.api.ts`, `useMessageSearch.ts`, `MessageSearchResultsDropdown.tsx`.

---

**Bước 15 — Push notifications** ✅

- **Queue:** BullMQ queue **`notify-message`**, job **`notify:message`** (`apps/server/src/features/push/notifyMessage.queue.ts`). **`messages.service.createMessage`** (REST + socket) enqueue sau khi tạo tin — thiếu **`VAPID_*`** trong env → không gửi job.
- **Worker:** `npm run worker` trong `apps/server` (`src/worker.ts`); dev gốc repo: **`npm run dev`** chạy kèm **`dev:worker`**. Worker: mỗi recipient (trừ người gửi), nếu **`presence:user:{userId}`** không online → gửi Web Push (`web-push`) tới mọi **`PushSubscription`** của user; 404/410 → xóa subscription.
- **DB:** bảng **`push_subscriptions`** (`endpoint` unique, `p256dh`, `auth`); migration **`20260331180000_push_subscriptions`**.
- **API:** `GET /api/push/vapid-public-key` (public); `POST /api/push/subscribe` / **`/unsubscribe`** (auth).
- **Env:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (+ `CLIENT_URL` cho deep link). Sinh key: `npx web-push generate-vapid-keys` (trong `apps/server`).
- **Client:** `public/sw.js` — push + `notificationclick` mở `/chat/:conversationId`. **`ensurePushSubscriptionRegistered`** (VAPID + `POST /subscribe`). **`PushPermissionBootstrap`** — sau đăng nhập: popup quyền **`Notification`** mặc định của trình duyệt; nếu cần gesture, thử lại sau lần tương tác đầu; đã **`granted`** → đăng ký push im lặng. **`useDocumentTitle`** + **`titleBar.store`** — `(n) Chat App`, flash tiêu đề khi tab ẩn + `chat:new`, **`navigator.setAppBadge`** nếu hỗ trợ.

---

## Phase 4 — Polish & Scale

**Bước 16 — Friend request system** ✅

- **Schema:** `Friendship` (đã có) + cột tùy chọn **`users.phone`** (unique, exact lookup). Đăng ký: `phone` 8–15 chữ số tùy chọn.
- **Tìm người (bảo mật):** `GET /api/users/lookup?q=` — **chỉ khớp chính xác** `username` **hoặc** `email` **hoặc** `phone` (không LIKE / không gợi ý). Rate limit 40/phút. Ẩn kết quả nếu trùng chính mình.
- **REST:** `POST /api/friends/request` `{ addresseeId }` (CUID); `POST /api/friends/accept/:friendshipId`; `DELETE /api/friends/:friendshipId` (hủy lời mời / từ chối / hủy kết bạn). `GET /api/friends/incoming`; `GET /api/friends/relationship/:otherUserId` (trạng thái với người kia). **Mutual:** nếu đã có PENDING chiều ngược, gửi request → chấp nhận kép + tạo DM.
- **DM:** Một DM giữa hai user (`getOrCreateDmId`) khi friendship chuyển ACCEPTED.
- **DB:** `Notification` (FRIEND_REQUEST / FRIEND_ACCEPTED) khi gửi / chấp nhận.
- **Socket:** `socket.join('user:'+userId)`; `friend:request:received`, `friend:updated` → client invalidate `friends` + `rooms`.
- **Push:** Cùng queue `notify-message`, job `notify:friend_request` / `notify:friend_accepted` (worker mở rộng).
- **Client:** `AddFriendDialog` — ô tìm debounce, placeholder *"Tìm kiếm với tên người dùng, email hoặc số điện thoại..."*, empty *"Không có người dùng phù hợp với từ khóa tìm kiếm."*, badge lời mời đến.

Code: `features/friends/*`, `users.lookup`, `friendSocket.emit.ts`, `notifyMessage.queue.ts` + `notifyMessage.worker.ts`, `AddFriendDialog.tsx`, `packages/shared-constants/user-lookup.ts`.

---

**Bước 17 — Infinite scroll history** ✅

- **Cursor + infinite:** `GET /api/rooms/:id/messages?cursor=&limit=`; **`useRoomMessagesInfinite`** + **`useMergedRoomMessages`**.
- **ChatThread:** Cuộn lên gần đỉnh (~80px) → tải thêm trang cũ; **debounce 150ms** trước khi gọi **`fetchNextPage`** (tránh kích hoạt đúp khi scroll rung). Trước khi fetch: lưu **`scrollHeight`** + **`scrollTop`**; sau khi prepend xong (**`useLayoutEffect`**, khi `!isFetchingNextPage`): **`scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)`** để không nhảy viewport. Reset state khi đổi **`conversationId`**.
- **Khác:** `useLayoutEffect` lần đầu mở room (cuộn đáy); `ResizeObserver` bám đáy khi ảnh tải; cuộn mượt tin mới từ người khác khi đang gần đáy.

Code: `ChatThread.tsx` (refs `pendingScrollRestoreRef`, `fetchHistoryDebounceRef`).

---

**Bước 18 — Rate limiting & Security** (một phần)

- **`helmet()`** toàn app.
- **`trust proxy`:** `app.set('trust proxy', 1)` khi **`NODE_ENV === 'production'`** hoặc **`TRUST_PROXY=1`/`true`** (Nginx — `req.ip` đúng client).
- **`express-rate-limit`** theo **từng nhóm route** (lookup user, search tin, ghi friends, …) — **không** dùng limit toàn `/api` (đã thử 100/15 phút toàn cục + limit socket `chat:send` nhưng gây **429** khi đổi room nhiều lần / client refresh nhiều request → đã **gỡ**).
- **Validate:** Zod trên nhiều endpoint; upload qua **env** + `GET /api/config/upload`.
- **Chưa / tùy chọn:** rate limit toàn cục mềm hơn (theo user hoặc session); rate limit socket có ngưỡng rất cao; sanitize rộng; log/audit tập trung.

Code: `server.ts`, `config/env.ts` (`TRUST_PROXY`); các file route (`users.routes`, `search.routes`, `friends.routes`, …).

---

**Bước 21 — Auth đầy đủ & email giao dịch** ✅

- **Schema:** `User.emailVerifiedAt`; bảng **`email_verification_tokens`** (OTP đăng ký / xác thực), **`forgot_password_otps`** (OTP quên mật khẩu); thay thế flow reset bằng link (`password_reset_tokens` đã gỡ).
- **Đăng nhập:** body **`{ identifier, password }`** — khớp **email**, **username** hoặc **phone** (Passport Local + `findUserByLoginIdentifier`).
- **Email bắt buộc:** middleware **`requireEmailVerified`** sau `authenticate` trên rooms/messages/friends/users/search/config/push/…; Socket.IO từ chối nếu chưa verify (**`EMAIL_NOT_VERIFIED`**). Màn **`/verify-email`** (nhập mã OTP), **`POST /auth/verify-email`**, **`POST /auth/resend-verification`** (rate limit). Client: **`VerifiedRoute`**, interceptor 403 → redirect verify.
- **Forgot password:** **`POST /auth/forgot-password`** gửi OTP; **`POST /auth/reset-password`** `{ email, code, password }`; trang **`/reset-password?email=`** + gửi lại mã.
- **Mật khẩu:** **`POST /auth/change-password`** (có mật khẩu cũ); **`POST /auth/set-password`** chỉ **`newPassword`** khi tài khoản OAuth-only (chưa có `password` trong DB). Thông báo qua queue sau đổi/đặt/reset.
- **Mail:** BullMQ queue **`outbound-mail`** (`features/mail/mail.queue.ts`), worker **`startMailWorker()`** trong **`apps/server/src/worker.ts`** (cùng process với push worker). Template HTML inline đồng bộ theme client (`#0067ff`, sidebar `#0a1628`). **`GET /auth/me`** trả **`hasPassword`** (không lộ hash).
- **Frontend:** menu avatar (**DropdownMenu**): tên hiển thị, **`@username`**, Hồ sơ (**`/profile`**), Cài đặt (**`/settings`**), Đăng xuất; **`AppShellLayout`** khớp rail sidebar. Socket & **`useRoomsQuery`** chỉ bật khi **`emailVerifiedAt`**; push bootstrap tương tự.
- **Env / vận hành:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`; chạy **`npm run worker`** (hoặc `dev` kèm worker) để xử lý hàng đợi mail.

Code: `modules/auth/*`, `middlewares/requireEmailVerified.ts`, `features/mail/*`, `socketAuth.middleware.ts`; client `VerifiedRoute`, `VerifyEmailPage`, `ProfilePage`, `SettingsPage`, `ChatNavRail` (dropdown), `api.ts` (403 verify).

---

**Bước 19 — Mobile responsive UI**

Breakpoint strategy: mobile-first với Tailwind. Layout: sidebar ẩn trên mobile, slide-in từ trái. `BottomNav` với các tab chính. Touch targets tối thiểu 44px. Input font-size 16px để tránh iOS zoom. Safe area insets cho notch/home indicator. Test kỹ trên iOS Safari và Android Chrome.

---

**Bước 20 — VPS deployment**

Backend: PM2 với `ecosystem.config.js`, Nginx reverse proxy cho cả REST API và Socket.IO (`proxy_http_version 1.1`, `upgrade` và `connection` headers cho WebSocket; path **`/ws`** khớp client). Docker Compose cho PostgreSQL và Redis. Certbot SSL. Frontend: build Vite, serve static qua Nginx. CI đơn giản: push → pull trên server → `pm2 reload`.

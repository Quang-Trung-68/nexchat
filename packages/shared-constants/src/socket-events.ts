/**
 * Tên event Socket.IO — khớp server (`apps/server/src/features/sockets/`) và client.
 */
export const SOCKET_EVENTS = {
  CHAT_SEND: 'chat:send',
  CHAT_NEW: 'chat:new',
  /** Server → room: tin đã có (cập nhật attachments sau upload Cloudinary). */
  CHAT_MESSAGE_UPDATED: 'chat:message:updated',
  /** Server → room: cập nhật reaction (summary + danh sách userId + emoji). */
  CHAT_REACTION_UPDATED: 'chat:reaction:updated',
  CHAT_ERROR: 'chat:error',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  /** Server → socket vừa kết nối: hydrate ai đang online (Redis/memory), tránh lỡ sự kiện trước đó. */
  PRESENCE_SYNC: 'presence:sync',
  /** Client → server: đánh dấu đã đọc tới hiện tại trong room. */
  ROOM_READ: 'room:read',
  /** Server → room: ai đó vừa cập nhật lastReadAt (tick / refresh unread). */
  RECEIPT_READ: 'receipt:read',
  /** Client → server: join Socket.IO room sau khi có membership mới (tạo nhóm / refetch). */
  CONVERSATION_JOIN: 'conversation:join',
  /** Server → room: danh sách ghim thay đổi (client invalidate GET pins). */
  ROOM_PINS_UPDATED: 'room:pins:updated',
  /** Server → user:{userId}: có lời mời kết bạn mới. */
  FRIEND_REQUEST_RECEIVED: 'friend:request:received',
  /** Server → user:{userId}: lời mời được chấp nhận / trạng thái bạn bè đổi. */
  FRIEND_UPDATED: 'friend:updated',
  /** WebRTC voice (DM): relay offer / answer / ICE — payload JSON string. */
  CALL_SIGNAL: 'call:signal',
  /** Server → người gọi: đối phương trong phòng (có thể đổ chuông). */
  CALL_RINGING: 'call:ringing',
  /** Kết thúc / từ chối cuộc gọi thoại. */
  CALL_END: 'call:end',
  /**
   * Server → user:{userId}: danh sách phòng cần đồng bộ (tạo nhóm / membership).
   * Client invalidate GET /rooms; `sidebarHint` chỉ cho người được thêm (không phải người tạo).
   */
  ROOM_LIST_UPDATED: 'room:list:updated',
  /** Server → user:{userId}: thông báo mới (DB + badge). */
  NOTIFICATION_NEW: 'notification:new',
  /** Server → user:{userId}: cập nhật like trên bài nhật ký. */
  POST_LIKE_UPDATED: 'post:like:updated',
  /** Server → user:{userId}: bình luận mới / cập nhật. */
  POST_COMMENT_UPDATED: 'post:comment:updated',
} as const

export type SocketEventKey = keyof typeof SOCKET_EVENTS
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey]

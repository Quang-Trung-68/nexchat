export const SOCKET_EVENTS = {
  // Connection / Room
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  // Messaging
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  // Typing
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  // Presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  // Read receipts
  MESSAGE_SEEN: 'message_seen',
} as const

export type SocketEventKey = keyof typeof SOCKET_EVENTS
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey]

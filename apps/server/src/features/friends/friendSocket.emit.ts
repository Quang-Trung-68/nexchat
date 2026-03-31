import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { io } from '@/features/sockets/socketServer'

export function emitFriendRequestReceived(targetUserId: string, payload: unknown): void {
  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, payload)
}

export function emitFriendUpdated(targetUserId: string, payload: unknown): void {
  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.FRIEND_UPDATED, payload)
}

export function emitFriendUpdatedToBoth(
  userIdA: string,
  userIdB: string,
  payload: unknown
): void {
  emitFriendUpdated(userIdA, payload)
  emitFriendUpdated(userIdB, payload)
}

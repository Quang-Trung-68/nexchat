import type { Socket } from 'socket.io'
import { roomsRepository } from '@/features/rooms/rooms.repository'

/** Join Socket.IO rooms named bằng `conversationId` (id trong DB). */
export async function joinConversationRoomsForSocket(
  socket: Socket,
  userId: string
): Promise<string[]> {
  const rows = await roomsRepository.findMembershipRowsForUser(userId)
  const ids = [...new Set(rows.map((r) => r.conversationId))]
  for (const conversationId of ids) {
    socket.join(conversationId)
  }
  return ids
}

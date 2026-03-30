import type { Server } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { MessageItemDto } from '@/features/messages/messages.types'

export function emitChatMessageUpdated(
  io: Server,
  conversationId: string,
  message: MessageItemDto
): void {
  io.to(conversationId).emit(SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, {
    conversationId,
    message,
  })
}

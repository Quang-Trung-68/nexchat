import type { Server } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { MessageItemDto, ReactionUpdatedPayload } from '@/features/messages/messages.types'

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

export function emitReactionUpdated(io: Server, payload: ReactionUpdatedPayload): void {
  io.to(payload.conversationId).emit(SOCKET_EVENTS.CHAT_REACTION_UPDATED, payload)
}

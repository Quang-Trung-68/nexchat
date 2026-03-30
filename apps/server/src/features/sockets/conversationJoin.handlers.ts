import type { Socket } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { typingConversationPayloadSchema } from '@/features/messages/messages.validation'
import { messagesRepository } from '@/features/messages/messages.repository'

/**
 * Cho phép join thêm room sau khi user được thêm vào conversation (kết nối cũ không tự join room mới).
 */
export function registerConversationJoinHandlers(socket: Socket) {
  const userId = socket.data.userId

  socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, async (raw: unknown) => {
    const parsed = typingConversationPayloadSchema.safeParse(raw)
    if (!parsed.success) return
    const { conversationId } = parsed.data

    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) return

    await socket.join(conversationId)
  })
}

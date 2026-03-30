import type { Server, Socket } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { chatSendPayloadSchema } from '@/features/messages/messages.validation'
import { messagesService } from '@/features/messages/messages.service'
import type { MessageItemDto } from '@/features/messages/messages.types'
import { AppError } from '@/shared/errors/AppError'

type ChatSendAck =
  | { ok: true; message: MessageItemDto }
  | { ok: false; code: string; message: string }

export function registerChatSocketHandlers(io: Server, socket: Socket) {
  socket.on(SOCKET_EVENTS.CHAT_SEND, async (raw: unknown, ack?: (r: ChatSendAck) => void) => {
    const parsed = chatSendPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Payload không hợp lệ'
      const err = { code: 'VALIDATION_ERROR' as const, message }
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, err)
      ack?.({ ok: false, ...err })
      return
    }

    const { conversationId, ...body } = parsed.data

    try {
      const message = await messagesService.createMessage(
        socket.data.userId,
        conversationId,
        body
      )
      io.to(conversationId).emit(SOCKET_EVENTS.CHAT_NEW, { conversationId, message })
      ack?.({ ok: true, message })
    } catch (e) {
      if (e instanceof AppError) {
        const err = { code: e.code, message: e.message }
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, err)
        ack?.({ ok: false, ...err })
      } else {
        const err = { code: 'INTERNAL_ERROR', message: 'Lỗi server' }
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, err)
        ack?.({ ok: false, ...err })
      }
    }
  })
}

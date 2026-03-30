import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { normalizeMessageSender, type MessageSenderPayload } from '@/lib/messageSender'
import type { MessageItemDto } from '../types/message.types'
import { normalizeMessagePayload } from '../api/messages.api'
import { useRealtimeMessagesStore } from '../store/realtimeMessages.store'
import { usePendingImageUploadsStore } from '../store/pendingImageUploads.store'

type ChatNewPayload = {
  conversationId: string
  message: MessageItemDto
}

type ChatErrorPayload = {
  code: string
  message: string
}

function normalizeMessage(m: MessageItemDto): MessageItemDto {
  return normalizeMessagePayload({
    ...m,
    createdAt:
      typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
    sender: normalizeMessageSender(m.sender as MessageSenderPayload),
  })
}

/**
 * Lắng nghe `chat:new` / `chat:error`, cập nhật Zustand (không refetch API).
 * Dùng chung một `socket` từ `useSocket()` (truyền từ `SocketBootstrap`).
 */
export function useChatRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()
  const upsertFromSocket = useRealtimeMessagesStore((s) => s.upsertFromSocket)
  const clearPendingUploads = usePendingImageUploadsStore((s) => s.clear)

  useEffect(() => {
    if (!socket || !connected) return

    const onNew = (payload: ChatNewPayload) => {
      if (!payload?.conversationId || !payload?.message) return
      const msg = normalizeMessage(payload.message)
      upsertFromSocket(payload.conversationId, msg)
      if (msg.attachments?.length) clearPendingUploads(msg.id)
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    }

    const onUpdated = (payload: ChatNewPayload) => {
      if (!payload?.conversationId || !payload?.message) return
      const msg = normalizeMessage(payload.message)
      upsertFromSocket(payload.conversationId, msg)
      if (msg.attachments?.length) clearPendingUploads(msg.id)
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    }

    const onError = (payload: ChatErrorPayload) => {
      if (import.meta.env.DEV) {
        console.warn('[chat:error]', payload?.code, payload?.message)
      }
    }

    socket.on(SOCKET_EVENTS.CHAT_NEW, onNew)
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, onUpdated)
    socket.on(SOCKET_EVENTS.CHAT_ERROR, onError)

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_NEW, onNew)
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, onUpdated)
      socket.off(SOCKET_EVENTS.CHAT_ERROR, onError)
    }
  }, [socket, connected, upsertFromSocket, clearPendingUploads, queryClient])
}

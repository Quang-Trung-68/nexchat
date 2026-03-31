import type { QueryClient } from '@tanstack/react-query'
import type { MessageItemDto } from '../types/message.types'
import { messagesInfiniteKeys } from '../queries/useRoomMessagesInfinite'
import { useRealtimeMessagesStore } from '../store/realtimeMessages.store'

/** Cập nhật reaction trên tin trong cache infinite query + Zustand (nếu có). */
export function applyReactionPatch(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  patch: Pick<MessageItemDto, 'reactionSummary' | 'myReactionEmoji'>
): void {
  queryClient.setQueryData(messagesInfiniteKeys.room(conversationId), (old) => {
    if (!old || typeof old !== 'object' || !('pages' in old)) return old
    const data = old as {
      pages: { messages: MessageItemDto[]; nextCursor: string | null; hasMore: boolean }[]
      pageParams: unknown[]
    }
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        messages: page.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      })),
    }
  })
  useRealtimeMessagesStore.getState().patchMessageReactions(conversationId, messageId, patch)
}

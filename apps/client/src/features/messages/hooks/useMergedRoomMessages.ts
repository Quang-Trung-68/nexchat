import { useMemo } from 'react'
import type { MessageItemDto } from '../types/message.types'
import { useRealtimeMessagesStore } from '../store/realtimeMessages.store'

const EMPTY_MESSAGES: MessageItemDto[] = []

function sortByTimeAsc(a: MessageItemDto, b: MessageItemDto): number {
  const ta = new Date(a.createdAt).getTime()
  const tb = new Date(b.createdAt).getTime()
  if (ta !== tb) return ta - tb
  return a.id.localeCompare(b.id)
}

/**
 * Gộp tin từ infinite query (cursor, các trang từ mới → cũ) + Zustand realtime, dedupe, sort ascending.
 */
export function useMergedRoomMessages(
  conversationId: string | undefined,
  pages: { messages: MessageItemDto[] }[] | undefined
): MessageItemDto[] {
  const realtimeSlice = useRealtimeMessagesStore((s) => {
    if (!conversationId) return EMPTY_MESSAGES
    return s.byConversation[conversationId] ?? EMPTY_MESSAGES
  })

  return useMemo(() => {
    if (!conversationId) return []
    const flat = (pages ?? []).flatMap((p) => p.messages)
    const byId = new Map<string, MessageItemDto>()
    for (const m of flat) {
      byId.set(m.id, m)
    }
    /** Socket có thể cập nhật cùng tin (attachments) — ghi đè bản từ API. */
    for (const m of realtimeSlice) {
      byId.set(m.id, m)
    }
    return Array.from(byId.values()).sort(sortByTimeAsc)
  }, [conversationId, pages, realtimeSlice])
}

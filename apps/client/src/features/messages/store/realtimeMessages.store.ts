import { create } from 'zustand'
import type { MessageItemDto } from '../types/message.types'

interface RealtimeMessagesState {
  /** Tin nhận qua Socket — gom theo conversation; cùng `id` thì ghi đè (cập nhật attachments). */
  byConversation: Record<string, MessageItemDto[]>
  upsertFromSocket: (conversationId: string, message: MessageItemDto) => void
  clearConversation: (conversationId: string) => void
  reset: () => void
}

export const useRealtimeMessagesStore = create<RealtimeMessagesState>((set) => ({
  byConversation: {},
  upsertFromSocket: (conversationId, message) =>
    set((state) => {
      const prev = state.byConversation[conversationId] ?? []
      const idx = prev.findIndex((m) => m.id === message.id)
      if (idx === -1) {
        return {
          byConversation: {
            ...state.byConversation,
            [conversationId]: [...prev, message],
          },
        }
      }
      const next = [...prev]
      next[idx] = message
      return {
        byConversation: {
          ...state.byConversation,
          [conversationId]: next,
        },
      }
    }),
  clearConversation: (conversationId) =>
    set((state) => {
      const next = { ...state.byConversation }
      delete next[conversationId]
      return { byConversation: next }
    }),
  reset: () => set({ byConversation: {} }),
}))

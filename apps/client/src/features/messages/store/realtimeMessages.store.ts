import { create } from 'zustand'
import type { MessageItemDto } from '../types/message.types'

interface RealtimeMessagesState {
  /** Tin nhận qua Socket `chat:new`, gom theo conversation (append, dedupe theo id). */
  byConversation: Record<string, MessageItemDto[]>
  appendFromSocket: (conversationId: string, message: MessageItemDto) => void
  clearConversation: (conversationId: string) => void
  reset: () => void
}

export const useRealtimeMessagesStore = create<RealtimeMessagesState>((set) => ({
  byConversation: {},
  appendFromSocket: (conversationId, message) =>
    set((state) => {
      const prev = state.byConversation[conversationId] ?? []
      if (prev.some((m) => m.id === message.id)) {
        return state
      }
      return {
        byConversation: {
          ...state.byConversation,
          [conversationId]: [...prev, message],
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

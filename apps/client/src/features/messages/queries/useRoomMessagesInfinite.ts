import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchMessagesPage, normalizeMessagePayload } from '../api/messages.api'

export const messagesInfiniteKeys = {
  room: (conversationId: string) => ['messages', conversationId] as const,
}

export function useRoomMessagesInfinite(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: conversationId ? messagesInfiniteKeys.room(conversationId) : ['messages', 'none'],
    enabled: Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await fetchMessagesPage(conversationId!, pageParam, 30)
      return {
        ...page,
        messages: page.messages.map(normalizeMessagePayload),
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

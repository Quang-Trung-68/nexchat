import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { useActiveConversationStore } from '@/features/chat/store/activeConversation.store'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useDocumentTitle } from './useDocumentTitle'

/** Đồng bộ `(unread) NexChat`, flash tiêu đề khi tab ẩn, badge OS. */
export function DocumentTitleSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data: rooms } = useRoomsQuery()
  const activeConversationId = useActiveConversationStore((s) => s.activeConversationId)
  const pageVisible = usePageVisibility()

  const totalUnread = useMemo(() => {
    if (!isAuthenticated || !rooms) return 0
    let sum = rooms.reduce((s, r) => s + (r.unreadCount ?? 0), 0)
    /** Đang xem đúng hội thoại (tab hiển thị): không cộng unread của room đó vào tiêu đề. */
    if (pageVisible && activeConversationId) {
      const cur = rooms.find((r) => r.id === activeConversationId)
      if (cur) sum -= cur.unreadCount
    }
    return Math.max(0, sum)
  }, [isAuthenticated, rooms, pageVisible, activeConversationId])

  useDocumentTitle(totalUnread)
  return null
}

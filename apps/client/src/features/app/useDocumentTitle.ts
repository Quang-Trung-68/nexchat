import { useEffect } from 'react'
import { useTitleBarStore } from './titleBar.store'

const BASE_TITLE = 'NexChat'

/**
 * Tiêu đề tab: `(n) NexChat` khi có chưa đọc; flash `● Người gửi: …` khi tab ẩn và có tin (qua store).
 * Đồng bộ badge OS (nếu trình duyệt hỗ trợ).
 */
export function useDocumentTitle(totalUnread: number) {
  const flash = useTitleBarStore((s) => s.flash)

  useEffect(() => {
    const activeFlash = flash && Date.now() < flash.until ? flash : null
    let title: string
    if (activeFlash) {
      title = `${activeFlash.line} — ${BASE_TITLE}`
    } else if (totalUnread > 0) {
      title = `(${totalUnread}) ${BASE_TITLE}`
    } else {
      title = BASE_TITLE
    }
    document.title = title

    if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
      void navigator.setAppBadge(totalUnread > 0 ? totalUnread : undefined).catch(() => {})
    }
    if (
      'clearAppBadge' in navigator &&
      typeof navigator.clearAppBadge === 'function' &&
      totalUnread === 0
    ) {
      void navigator.clearAppBadge().catch(() => {})
    }
  }, [totalUnread, flash])
}

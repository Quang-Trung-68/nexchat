import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { ensurePushSubscriptionRegistered } from '@/features/push/lib/webPushSubscribe'

/**
 * Push subscription chỉ lưu được sau khi:
 * - `Notification.permission === 'granted'`, và
 * - `POST /push/subscribe` thành công (có VAPID trên server).
 *
 * Chrome/Safari: `requestPermission()` gọi từ `useEffect` (không có user gesture) thường **không**
 * mở popup và vẫn để `default` → không có subscription. Vì vậy popup hệ thống chỉ gọi sau
 * **lần chạm / phím đầu tiên** trên trang (sau khi đăng nhập).
 */
export function PushPermissionBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  /** Đổi user (đăng nhập lại / tài khoản khác) → chạy lại để POST /push/subscribe đúng session. */
  const userId = useAuthStore((s) => s.user?.id)

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false
    let detachGesture: (() => void) | null = null

    const log = (msg: string, ...args: unknown[]) => {
      if (import.meta.env.DEV) console.info(`[push] ${msg}`, ...args)
    }

    const subscribeIfGranted = async (label: string) => {
      const ok = await ensurePushSubscriptionRegistered()
      if (cancelled) return
      if (ok) log(`Đã lưu subscription (${label}).`)
      else log(`Chưa lưu được subscription (${label}) — kiểm tra VAPID trên server và tab Network.`)
    }

    const run = async () => {
      if (typeof Notification === 'undefined') {
        log('Trình duyệt không hỗ trợ Notification API.')
        return
      }
      if (!('serviceWorker' in navigator)) {
        log('Không có Service Worker — push không dùng được.')
        return
      }

      if (Notification.permission === 'granted') {
        await subscribeIfGranted('đã granted trước đó')
        return
      }

      if (Notification.permission === 'denied') {
        log('Quyền thông báo đã bị từ chối — bật lại trong cài đặt trang (biểu tượng ổ khóa / site settings).')
        return
      }

      /** default: KHÔNG gọi requestPermission() ở đây — bắt buộc chờ gesture (chuột/chạm/phím). */
      log(
        'Permission "default": hãy chạm/chuột hoặc gõ phím bất kỳ trên trang để trình duyệt mở popup thông báo.'
      )

      const onFirstGesture = () => {
        detachGesture?.()
        detachGesture = null

        void (async () => {
          const p = await Notification.requestPermission()
          if (cancelled) return
          if (p === 'granted') await subscribeIfGranted('sau khi đồng ý popup')
          else if (p === 'denied') log('Đã từ chối thông báo.')
          else log('Quyền vẫn default — thử lại sau khi tương tác với trang.')
        })()
      }

      document.addEventListener('pointerdown', onFirstGesture, { capture: true })
      document.addEventListener('keydown', onFirstGesture, { capture: true })

      detachGesture = () => {
        document.removeEventListener('pointerdown', onFirstGesture, { capture: true })
        document.removeEventListener('keydown', onFirstGesture, { capture: true })
      }
    }

    void run()

    return () => {
      cancelled = true
      detachGesture?.()
    }
  }, [isAuthenticated, userId])

  return null
}

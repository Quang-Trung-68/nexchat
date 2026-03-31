import { fetchVapidPublicKey, postPushSubscribe } from '../api/push.api'

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const log = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.info('[push]', ...args)
}

/**
 * Đăng ký SW + tạo PushSubscription + POST lên server.
 *
 * Yêu cầu: `Notification.permission === 'granted'` trước khi gọi.
 * Trả `true` nếu subscription đã được lưu trên server thành công.
 */
export async function ensurePushSubscriptionRegistered(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      log('❌ ServiceWorker không được hỗ trợ.')
      return false
    }
    if (!('PushManager' in window)) {
      log('❌ PushManager không được hỗ trợ.')
      return false
    }
    if (Notification.permission !== 'granted') {
      log('❌ Notification.permission =', Notification.permission, '— cần granted trước.')
      return false
    }

    log('1/5 Lấy VAPID public key từ server…')
    const vapidPublicKey = await fetchVapidPublicKey()
    if (!vapidPublicKey) {
      log('❌ Server trả về VAPID key rỗng — kiểm tra VAPID_PUBLIC_KEY trong apps/server/.env.')
      return false
    }
    log('1/5 ✓ VAPID key:', vapidPublicKey.slice(0, 12) + '…')

    /** Đăng ký SW (idempotent) — KHÔNG dùng update() vì có thể đưa SW về waiting. */
    log('2/5 Đăng ký Service Worker /sw.js…')
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })

    /** Dùng `ready` thay vì registration trực tiếp — chờ đến khi SW ở trạng thái `active`. */
    log('2/5 Chờ SW active (navigator.serviceWorker.ready)…')
    const reg = await navigator.serviceWorker.ready
    log('2/5 ✓ SW active:', reg.active?.scriptURL)

    log('3/5 Kiểm tra subscription hiện có…')
    let sub = await reg.pushManager.getSubscription()

    if (sub) {
      /**
       * Kiểm tra applicationServerKey khớp — nếu subscription được tạo với VAPID key khác
       * (ví dụ: session trước hoặc DevTools tạo không có key), unsubscribe và tạo lại.
       */
      const existingKeyB64 = sub.options?.applicationServerKey
        ? btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey as ArrayBuffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
        : null

      const incomingKey = vapidPublicKey.replace(/=/g, '')
      if (existingKeyB64 !== null && existingKeyB64 !== incomingKey) {
        log('3/5 ⚠ Subscription cũ có VAPID key khác → unsubscribe và tạo lại.')
        await sub.unsubscribe()
        sub = null
      } else {
        log('3/5 ✓ Subscription hiện có hợp lệ, dùng lại.')
      }
    } else {
      log('3/5 Chưa có subscription, sẽ tạo mới.')
    }

    if (!sub) {
      log('4/5 Tạo PushSubscription mới…')
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      log('4/5 ✓ Tạo PushSubscription thành công, endpoint:', sub.endpoint.slice(0, 48) + '…')
    } else {
      log('4/5 (bỏ qua — dùng subscription hiện có)')
    }

    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      log('❌ Subscription thiếu keys (p256dh / auth).')
      return false
    }

    log('5/5 POST /push/subscribe lên server…')
    await postPushSubscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })
    log('5/5 ✓ Đã lưu subscription trên server.')
    return true
  } catch (e) {
    log('❌ Lỗi trong ensurePushSubscriptionRegistered:', e)
    return false
  }
}

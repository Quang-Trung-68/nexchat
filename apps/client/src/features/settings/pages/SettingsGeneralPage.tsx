import { useCallback, useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ensurePushSubscriptionRegistered } from '@/features/push/lib/webPushSubscribe'
import { postPushUnsubscribe } from '@/features/push/api/push.api'

async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  try {
    await postPushUnsubscribe(sub.endpoint)
  } catch {
    /* vẫn unsubscribe local */
  }
  await sub.unsubscribe()
}

export function SettingsGeneralPage() {
  const [pushOn, setPushOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const syncFromBrowser = useCallback(() => {
    if (typeof Notification === 'undefined') return
    const granted = Notification.permission === 'granted'
    setPushOn(granted)
  }, [])

  useEffect(() => {
    syncFromBrowser()
  }, [syncFromBrowser])

  const onToggle = async (checked: boolean) => {
    setBusy(true)
    try {
      if (checked) {
        if (typeof Notification === 'undefined') {
          return
        }
        const p = await Notification.requestPermission()
        if (p === 'granted') {
          const ok = await ensurePushSubscriptionRegistered()
          setPushOn(ok)
        } else {
          setPushOn(false)
        }
      } else {
        await unsubscribePush()
        setPushOn(false)
      }
    } finally {
      setBusy(false)
      syncFromBrowser()
    }
  }

  const notificationsUnsupported =
    typeof Notification === 'undefined' || !('serviceWorker' in navigator)

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h2 className="text-xl font-semibold text-neutral-900">Cài đặt chung</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Thông báo trên trình duyệt (tin nhắn mới, v.v.) khi bạn không mở tab.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-white p-6 shadow-sm">
        {notificationsUnsupported ? (
          <p className="text-sm text-muted-foreground">
            Trình duyệt không hỗ trợ thông báo hoặc Service Worker.
          </p>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              id="notif"
              checked={pushOn}
              disabled={busy}
              onCheckedChange={(v) => void onToggle(v === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="notif" className="text-sm font-medium leading-snug">
                Cho phép thông báo
              </Label>
              <p className="text-xs text-muted-foreground">
                Cần quyền từ trình duyệt. Tắt sẽ gỡ đăng ký push trên thiết bị này.
              </p>
              {Notification.permission === 'denied' ? (
                <p className="mt-2 text-xs text-amber-800">
                  Quyền đã bị chặn — mở cài đặt trang (biểu tượng ổ khóa) để bật lại thông báo.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

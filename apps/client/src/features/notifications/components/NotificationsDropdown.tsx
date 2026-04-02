import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NotificationBellButton } from '@/shared/components/NotificationBellButton'
import {
  fetchNotificationsList,
  markAllNotificationsRead,
  type NotificationItemDto,
} from '../api/notifications.api'
import { notificationUnreadKeys, notificationListKeys } from '../queries/notificationQueryKeys'

type NotificationsDropdownProps = {
  variant?: 'onPrimary' | 'surface'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsDropdown({ variant = 'onPrimary' }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const listQuery = useQuery({
    queryKey: notificationListKeys.list,
    queryFn: () => fetchNotificationsList(40),
    enabled: open,
  })

  const markAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationUnreadKeys.count })
      void qc.invalidateQueries({ queryKey: notificationListKeys.list })
    },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      void markAllMut.mutateAsync().catch(() => {})
    }
  }

  const items = listQuery.data ?? []

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton variant={variant} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        className="w-[min(100vw-2rem,22rem)] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Thông báo</p>
        </div>
        {listQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : listQuery.isError ? (
          <p className="px-3 py-6 text-center text-xs text-destructive">Không tải được thông báo.</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Chưa có thông báo.</p>
        ) : (
          <ScrollArea className="max-h-[min(60vh,320px)]">
            <ul className="py-1">
              {items.map((n: NotificationItemDto) => (
                <li
                  key={n.id}
                  className="border-b border-border/40 px-3 py-2.5 last:border-0"
                >
                  <p className="text-xs font-medium text-[#0068ff]">{n.title}</p>
                  <p className="mt-0.5 text-sm text-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import * as React from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount'

type NotificationBellButtonProps = {
  className?: string
  /** Rail trắng trên nền primary; mobile có thể dùng variant="surface" */
  variant?: 'onPrimary' | 'surface'
}

export const NotificationBellButton = React.forwardRef<HTMLButtonElement, NotificationBellButtonProps>(
  function NotificationBellButton({ className, variant = 'onPrimary', ...props }, ref) {
  const { data: count = 0 } = useUnreadNotificationCount()
  const label = count > 99 ? '99+' : count > 0 ? String(count) : null

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        'relative grid h-10 w-10 shrink-0 place-items-center rounded-full outline-none transition-colors',
        variant === 'onPrimary' && 'text-white hover:bg-white/15',
        variant === 'surface' &&
          'text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60 bg-background shadow-sm',
        className
      )}
      aria-label={count > 0 ? `Thông báo (${count > 99 ? '99+' : count} chưa đọc)` : 'Thông báo'}
    >
      <Bell className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      {label ? (
        <span
          className={cn(
            'pointer-events-none absolute right-0 top-0 flex min-h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white',
            variant === 'onPrimary' && 'bg-red-500 ring-2 ring-primary',
            variant === 'surface' && 'bg-red-500 ring-2 ring-background'
          )}
        >
          {label}
        </span>
      ) : null}
    </button>
  )
  }
)
NotificationBellButton.displayName = 'NotificationBellButton'

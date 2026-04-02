import { NavLink, useLocation } from 'react-router-dom'
import { BookMarked, MessageCircle, Settings, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items: {
  to: string
  label: string
  match: (pathname: string) => boolean
  icon: typeof MessageCircle
}[] = [
  {
    to: '/chat',
    label: 'Tin nhắn',
    match: (p) => p.startsWith('/chat'),
    icon: MessageCircle,
  },
  {
    to: '/contacts/friends',
    label: 'Danh bạ',
    match: (p) => p.startsWith('/contacts'),
    icon: Users,
  },
  {
    to: '/newsfeed',
    label: 'Nhật ký',
    match: (p) => p.startsWith('/newsfeed'),
    icon: BookMarked,
  },
  { to: '/profile', label: 'Hồ sơ', match: (p) => p === '/profile', icon: User },
  {
    to: '/settings/general',
    label: 'Cài đặt',
    match: (p) => p.startsWith('/settings'),
    icon: Settings,
  },
]

/** Thanh điều hướng dưới — phone / tablet; ẩn từ `lg` (có rail desktop). */
export function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
      role="navigation"
      aria-label="Điều hướng chính"
    >
      {items.map(({ to, label, match, icon: Icon }) => {
        const active = match(pathname)
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[11px] font-medium leading-tight',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-6 w-6 shrink-0', active && 'text-primary')} strokeWidth={2} aria-hidden />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Padding đáy để nội dung không chạm thanh điều hướng + safe area (chỉ mobile). */
export function mobileNavBottomPaddingClassName() {
  return 'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0'
}

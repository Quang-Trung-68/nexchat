import { NavLink } from 'react-router-dom'
import { Bell, KeyRound, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const links: { to: string; label: string; icon: typeof Bell }[] = [
  { to: '/settings/general', label: 'Cài đặt chung', icon: Bell },
  { to: '/settings/account', label: 'Tài khoản', icon: User },
  { to: '/settings/password', label: 'Mật khẩu', icon: KeyRound },
]

export function SettingsSubNav() {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/settings/general'}>
          {({ isActive }) => (
            <span
              className={cn(
                'flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#e5f0ff] text-[#0068ff]'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

import { AppShellLayout } from '@/shared/layouts/AppShellLayout'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ProfilePage() {
  const { user } = useAuth()
  const initial = (user?.displayName ?? '?').slice(0, 1).toUpperCase()
  const phoneLabel = user?.phone?.trim() ? user.phone : '—'

  const rows: { label: string; value: string }[] = [
    { label: 'Tên hiển thị', value: user?.displayName ?? '—' },
    { label: 'Username', value: user?.username ? `@${user.username}` : '—' },
    { label: 'Số điện thoại', value: phoneLabel },
  ]

  return (
    <AppShellLayout>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-xl px-6 py-10">
          <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Hồ sơ của bạn</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Chỉ xem thông tin. Để chỉnh sửa, vào{' '}
            <span className="font-medium text-foreground">Cài đặt → Tài khoản</span>.
          </p>
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24 border border-border">
                {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xl">{initial}</AvatarFallback>
              </Avatar>
              <dl className="w-full flex-1 space-y-4">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between"
                  >
                    <dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
                    <dd className="text-sm font-medium text-neutral-900 sm:text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppShellLayout>
  )
}

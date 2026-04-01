import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'

type AppShellLayoutProps = {
  children: ReactNode
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const { user, logout } = useAuth()
  const contactsPendingBadge = useContactsPendingBadge()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <ChatNavRail
        displayName={user?.displayName}
        username={user?.username}
        avatarUrl={user?.avatarUrl}
        onLogout={() => void logout()}
        contactsPendingBadge={contactsPendingBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f5f7]">
        {children}
      </div>
    </div>
  )
}

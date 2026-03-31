import { Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { ChatGlobalSearchToolbarStandalone } from '@/features/chat/components/ChatGlobalSearchToolbar'
import { ContactsSubNav } from '@/features/contacts/components/ContactsSubNav'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'

export function ContactsLayout() {
  const { user, logout } = useAuth()
  const contactsPendingBadge = useContactsPendingBadge()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <ChatNavRail
        displayName={user?.displayName}
        avatarUrl={user?.avatarUrl}
        onLogout={() => void logout()}
        contactsPendingBadge={contactsPendingBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="flex h-full w-full max-w-[300px] shrink-0 flex-col border-r border-border/80 bg-white">
          <ChatGlobalSearchToolbarStandalone />
          <ContactsSubNav />
        </aside>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

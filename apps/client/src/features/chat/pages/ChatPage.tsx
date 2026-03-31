import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { ChatNavRail } from '../components/ChatNavRail'
import { ChatRoomList } from '../components/ChatRoomList'
import { ChatWelcome } from '../components/ChatWelcome'
import { ChatThread } from '../components/ChatThread'
import { ChatRightPanel } from '../components/ChatRightPanel'
import { useActiveConversationStore } from '../store/activeConversation.store'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const setActiveConversationId = useActiveConversationStore((s) => s.setActiveConversationId)

  useEffect(() => {
    setActiveConversationId(conversationId ?? null)
    return () => setActiveConversationId(null)
  }, [conversationId, setActiveConversationId])
  const { user, logout } = useAuth()
  const contactsPendingBadge = useContactsPendingBadge()
  const { data: rooms } = useRoomsQuery()
  const [rightOpen, setRightOpen] = useState(true)
  const [roomSearchOpen, setRoomSearchOpen] = useState(false)
  const scrollToMessageRef = useRef<(messageId: string) => Promise<void>>(async () => {})

  const room = rooms?.find((r) => r.id === conversationId)

  useEffect(() => {
    setRoomSearchOpen(false)
  }, [conversationId])

  const toggleRoomSearch = useCallback(() => {
    setRoomSearchOpen((prev) => {
      const next = !prev
      if (next) setRightOpen(true)
      return next
    })
  }, [])

  const onScrollToMessageReady = useCallback((fn: (messageId: string) => Promise<void>) => {
    scrollToMessageRef.current = fn
  }, [])

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <ChatNavRail
        displayName={user?.displayName}
        avatarUrl={user?.avatarUrl}
        onLogout={() => void logout()}
        contactsPendingBadge={contactsPendingBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <ChatRoomList rooms={rooms} currentUserId={user?.id} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {conversationId ? (
            <ChatThread
              conversationId={conversationId}
              room={room}
              currentUserId={user?.id}
              onToggleRightPanel={() => setRightOpen((o) => !o)}
              rightPanelOpen={rightOpen}
              roomSearchOpen={roomSearchOpen}
              onToggleRoomSearch={toggleRoomSearch}
              onScrollToMessageReady={onScrollToMessageReady}
            />
          ) : (
            <ChatWelcome />
          )}
        </div>
        {conversationId && room && rightOpen ? (
          <ChatRightPanel
            room={room}
            currentUserId={user?.id}
            onClose={() => setRightOpen(false)}
            onPinnedMessageClick={(messageId) => void scrollToMessageRef.current(messageId)}
            roomSearchOpen={roomSearchOpen}
            onCloseRoomSearch={() => setRoomSearchOpen(false)}
            onRoomSearchPickMessage={(messageId) => void scrollToMessageRef.current(messageId)}
          />
        ) : null}
      </div>
    </div>
  )
}

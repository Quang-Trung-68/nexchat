import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { useJoinSocketRooms } from '@/features/sockets/useJoinSocketRooms'
import { ChatNavRail } from '../components/ChatNavRail'
import { ChatRoomList } from '../components/ChatRoomList'
import { ChatWelcome } from '../components/ChatWelcome'
import { ChatThread } from '../components/ChatThread'
import { ChatRightPanel } from '../components/ChatRightPanel'

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { data: rooms } = useRoomsQuery()
  const [rightOpen, setRightOpen] = useState(true)

  useJoinSocketRooms(rooms)

  const room = rooms?.find((r) => r.id === conversationId)

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <ChatNavRail displayName={user?.displayName} avatarUrl={user?.avatarUrl} />
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
          />
        ) : null}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LogOut, Search } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { formatSidebarTime } from '../utils/format'
import { CreateGroupDialog } from './CreateGroupDialog'
import { useMinuteTicker } from '@/hooks/useMinuteTicker'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'

type ChatRoomListProps = {
  rooms: RoomListItem[] | undefined
  currentUserId: string | undefined
}

export function ChatRoomList({ rooms, currentUserId }: ChatRoomListProps) {
  const { conversationId } = useParams()
  const { logout } = useAuth()
  useMinuteTicker()
  const typingByConversation = useTypingPresenceStore((s) => s.typingByConversation)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const filtered = useMemo(() => {
    let list = rooms ?? []
    if (tab === 'unread') list = list.filter((r) => r.unreadCount > 0)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((r) => {
        const title = getRoomTitle(r, currentUserId).toLowerCase()
        const prev = r.lastMessage?.content?.toLowerCase() ?? ''
        const typingIds = (typingByConversation[r.id] ?? []).filter((id) => id !== currentUserId)
        const typingLabels = typingIds
          .map((id) => {
            const p = r.participants.find((x) => x.id === id)
            return p ? userDisplayName(p) : ''
          })
          .filter(Boolean)
        const typingSearch =
          typingLabels.length === 0
            ? ''
            : typingLabels.length === 1
              ? `${typingLabels[0]} đang nhập…`.toLowerCase()
              : `${typingLabels.join(', ')} đang nhập…`.toLowerCase()
        return title.includes(n) || prev.includes(n) || typingSearch.includes(n)
      })
    }
    return list
  }, [rooms, tab, q, currentUserId, typingByConversation])

  return (
    <div className="flex h-full min-h-0 w-full max-w-[360px] shrink-0 flex-col border-r border-border bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-border p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm"
            className="h-9 border-border bg-muted/40 pl-9"
          />
        </div>
        <CreateGroupDialog />
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 px-2 pt-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="unread">Chưa đọc</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs text-muted-foreground">
        <span>Phân loại</span>
        <span className="opacity-50">⋯</span>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Không có hội thoại</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((room) => {
              const title = getRoomTitle(room, currentUserId)
              const active = conversationId === room.id
              const last = room.lastMessage
              const previewBase = last?.content?.slice(0, 80) ?? (last ? 'Tin nhắn' : 'Chưa có tin')
              const sender = last
                ? room.participants.find((p) => p.id === last.senderId)
                : undefined
              const typingIds = (typingByConversation[room.id] ?? []).filter(
                (id) => id !== currentUserId
              )
              const typingLabels = typingIds.map((id) => {
                const p = room.participants.find((x) => x.id === id)
                return p ? userDisplayName(p) : '…'
              })
              const typingLine =
                typingLabels.length === 0
                  ? null
                  : typingLabels.length === 1
                    ? `${typingLabels[0]} đang nhập…`
                    : `${typingLabels.join(', ')} đang nhập…`

              const previewPlain =
                room.type === 'GROUP' && last && sender
                  ? `${userDisplayName(sender)}: ${previewBase}`
                  : previewBase
              const preview = typingLine ?? previewPlain
              const time = last ? formatSidebarTime(last.createdAt) : ''
              const unreadHighlight = room.unreadCount > 0 && !active
              const initial = title.slice(0, 1).toUpperCase()
              const other = room.participants.find((p) => p.id !== currentUserId)
              const av = room.type === 'GROUP' ? null : other?.avatarUrl

              return (
                <li key={room.id}>
                  <Link
                    to={`/chat/${room.id}`}
                    className={cn(
                      'flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60',
                      active && 'bg-accent/80'
                    )}
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      {av ? <AvatarImage src={av} alt="" /> : null}
                      <AvatarFallback className="bg-primary/15 text-sm font-medium text-primary">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-foreground',
                            unreadHighlight ? 'font-bold' : 'font-semibold'
                          )}
                        >
                          {title}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {room.unreadCount > 0 ? (
                            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                              {room.unreadCount > 99 ? '99+' : room.unreadCount}
                            </span>
                          ) : null}
                          {time ? (
                            <span className="text-[11px] text-muted-foreground">{time}</span>
                          ) : null}
                        </div>
                      </div>
                      <p
                        className={cn(
                          'truncate text-sm',
                          unreadHighlight ? 'font-semibold text-foreground' : 'text-muted-foreground',
                          typingLine && 'italic text-primary'
                        )}
                      >
                        {preview}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

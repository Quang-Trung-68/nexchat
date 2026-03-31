import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { formatSidebarTime } from '../utils/format'
import {
  ChatGlobalSearchToolbar,
  type SearchScopeTab,
} from './ChatGlobalSearchToolbar'
import { useMinuteTicker } from '@/hooks/useMinuteTicker'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'

type ChatRoomListProps = {
  rooms: RoomListItem[] | undefined
  currentUserId: string | undefined
}

export function ChatRoomList({ rooms, currentUserId }: ChatRoomListProps) {
  const { conversationId } = useParams()
  useMinuteTicker()
  const typingByConversation = useTypingPresenceStore((s) => s.typingByConversation)
  const [q, setQ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchScopeTab, setSearchScopeTab] = useState<SearchScopeTab>('all')
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const scopeAllowsMessageSearch = searchScopeTab === 'all' || searchScopeTab === 'messages'

  const messageSearch = useMessageSearch({
    mode: 'global',
    conversationId: undefined,
    rawQuery: q,
    enabled: searchFocused && scopeAllowsMessageSearch,
  })

  const filtered = useMemo(() => {
    let list = rooms ?? []
    if (tab === 'unread') list = list.filter((r) => r.unreadCount > 0)
    if (q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH) return list
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

  const closeSearchUi = () => {
    setQ('')
    setSearchFocused(false)
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-[300px] shrink-0 flex-col border-r border-border/80 bg-white">
      <ChatGlobalSearchToolbar
        q={q}
        onQChange={setQ}
        searchFocused={searchFocused}
        onSearchFocusChange={setSearchFocused}
        searchScopeTab={searchScopeTab}
        onSearchScopeTabChange={setSearchScopeTab}
        messageSearch={messageSearch}
        onCloseSearchUi={closeSearchUi}
      />

      <div className="flex shrink-0 border-b border-border/60 px-2">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={cn(
            'relative flex-1 py-2.5 text-sm font-medium transition-colors',
            tab === 'all'
              ? 'text-[#0068ff]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Tất cả
          {tab === 'all' ? (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0068ff]" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={cn(
            'relative flex-1 py-2.5 text-sm font-medium transition-colors',
            tab === 'unread'
              ? 'text-[#0068ff]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Chưa đọc
          {tab === 'unread' ? (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0068ff]" />
          ) : null}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Không có hội thoại</p>
        ) : (
          <ul className="py-1">
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
                      'flex gap-2.5 px-3 py-2 transition-colors',
                      active
                        ? 'bg-[#e5f0ff]'
                        : 'hover:bg-[#f0f4ff]'
                    )}
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      {av ? <AvatarImage src={av} alt="" /> : null}
                      <AvatarFallback className="bg-[#0068ff]/15 text-sm font-medium text-[#0068ff]">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-sm text-foreground',
                            unreadHighlight ? 'font-bold' : 'font-semibold'
                          )}
                        >
                          {title}
                        </span>
                        {time ? (
                          <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                            {time}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-end justify-between gap-2">
                        <p
                          className={cn(
                            'min-w-0 flex-1 truncate text-xs',
                            unreadHighlight ? 'font-semibold text-foreground' : 'text-muted-foreground',
                            typingLine && 'italic text-[#0068ff]'
                          )}
                        >
                          {preview}
                        </p>
                        {room.unreadCount > 0 && !active ? (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        ) : null}
                      </div>
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

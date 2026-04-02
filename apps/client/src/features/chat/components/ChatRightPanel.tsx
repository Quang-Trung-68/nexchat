import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PanelRightClose,
  Pencil,
  Pin,
  Trash2,
  Users,
} from 'lucide-react'
import { MAX_PINS_PER_CONVERSATION } from '@chat-app/shared-constants'
import { ChatThreadRoomSearchPanel } from './ChatThreadRoomSearchPanel'
import { DisbandGroupConfirmDialog } from './DisbandGroupConfirmDialog'
import { PromoteAdminConfirmDialog } from './PromoteAdminConfirmDialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRoomPinsQuery } from '@/features/rooms/queries/useRoomPins'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { disbandGroup, transferGroupOwner } from '@/features/rooms/api/rooms.api'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { cn } from '@/lib/utils'
import { userDisplayName } from '@/lib/userDisplay'

type ChatRightPanelProps = {
  room: RoomListItem
  currentUserId: string | undefined
  onClose: () => void
  className?: string
  /** Cuộn tới tin trong thread (đăng ký từ ChatThread). */
  onPinnedMessageClick?: (messageId: string) => void
  /** Hiển thị khối tìm kiếm trong hội thoại (toggle từ icon header ChatThread). */
  roomSearchOpen: boolean
  onCloseRoomSearch: () => void
  onRoomSearchPickMessage?: (messageId: string) => void
}

function CollapsibleHeader({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/30"
    >
      {children}
      {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  )
}

export function ChatRightPanel({
  room,
  currentUserId,
  onClose,
  onPinnedMessageClick,
  roomSearchOpen,
  onCloseRoomSearch,
  onRoomSearchPickMessage,
  className,
}: ChatRightPanelProps) {
  const title = getRoomTitle(room, currentUserId)
  const initial = title.slice(0, 1).toUpperCase()
  const { data: pins = [] } = useRoomPinsQuery(room.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pinsOpen, setPinsOpen] = useState(true)
  const [membersOpen, setMembersOpen] = useState(true)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [disbandDialogOpen, setDisbandDialogOpen] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState<{ id: string; name: string } | null>(null)

  const isGroupOwner =
    room.type === 'GROUP' &&
    Boolean(currentUserId && room.participants.some((p) => p.id === currentUserId && p.role === 'OWNER'))

  const sortedParticipants = useMemo(() => {
    if (room.type !== 'GROUP') return room.participants
    return [...room.participants].sort((a, b) => {
      const ao = a.role === 'OWNER' ? 0 : 1
      const bo = b.role === 'OWNER' ? 0 : 1
      if (ao !== bo) return ao - bo
      return userDisplayName(a).localeCompare(userDisplayName(b), 'vi', { sensitivity: 'base' })
    })
  }, [room.participants, room.type])

  const disbandMut = useMutation({
    mutationFn: () => disbandGroup(room.id),
    onSuccess: () => {
      setDisbandDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
      onClose()
      navigate('/chat')
    },
  })

  const transferMut = useMutation({
    mutationFn: (newOwnerId: string) => transferGroupOwner(room.id, newOwnerId),
    onSuccess: () => {
      setPromoteTarget(null)
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    },
  })

  return (
    <div
      className={cn(
        'flex h-full w-full max-w-[320px] shrink-0 flex-col border-l border-border/80 bg-white',
        'max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-[min(100vw,320px)] max-lg:border-l-0 max-lg:shadow-2xl',
        'max-lg:animate-in max-lg:slide-in-from-right max-lg:duration-300',
        className
      )}
    >
      {
        roomSearchOpen ? null : (
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              Thông tin hội thoại
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Đóng panel">
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>
        )
      }

      <ChatThreadRoomSearchPanel
        open={roomSearchOpen}
        onClose={onCloseRoomSearch}
        conversationId={room.id}
        onPickMessage={(messageId) => onRoomSearchPickMessage?.(messageId)}
        className={cn(
          'shadow-none',
          roomSearchOpen ? 'min-h-0 flex-1 border-b-0' : 'max-h-[min(45vh,400px)] shrink-0'
        )}
      />

      {!roomSearchOpen ? (
        <>
          <div className="shrink-0 border-b border-border/40 px-4 pb-0 pt-5 text-center">
            <Avatar className="mx-auto h-[60px] w-[60px]">
              <AvatarFallback className="text-lg font-medium">{initial}</AvatarFallback>
            </Avatar>
            <h2 className="mt-2.5 flex items-center justify-center gap-1.5 text-[15px] font-semibold text-foreground">
              {title}
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </h2>
            <div className="mt-5 grid grid-cols-3 gap-1 px-4 pb-4">
              <Button
                type="button"
                variant="ghost"
                disabled
                className="flex h-auto flex-col gap-1.5 py-2 text-[11px] font-normal text-muted-foreground hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-foreground">
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <span className="leading-tight text-foreground">Tắt thông<br/>báo</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled
                className="flex h-auto flex-col gap-1.5 py-2 text-[11px] font-normal text-muted-foreground hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-foreground">
                  <Pin className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <span className="leading-tight text-foreground">Ghim hội<br/>thoại</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled
                className="flex h-auto flex-col gap-1.5 py-2 text-[11px] font-normal text-muted-foreground hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-foreground">
                  <Users className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <span className="leading-tight text-foreground">Tạo nhóm<br/>trò chuyện</span>
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={false} onToggle={() => {}}>
                <span className="flex items-center gap-3 font-normal">
                  <AlarmClock className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                  Danh sách nhắc hẹn
                </span>
              </CollapsibleHeader>
            </div>
            
            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={membersOpen} onToggle={() => setMembersOpen((o) => !o)}>
                <span className="flex items-center gap-3 font-normal">
                  <Users className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                  {room.type === 'GROUP' ? `${room.participants.length} thành viên` : '1 nhóm chung'}
                </span>
              </CollapsibleHeader>
              {membersOpen ? (
                <ul className="space-y-1 pb-3 pt-1">
                  {sortedParticipants.map((p) => {
                    const label = userDisplayName(p)
                    const isOwner = room.type === 'GROUP' && p.role === 'OWNER'
                    const canPromote =
                      isGroupOwner &&
                      Boolean(currentUserId && p.id !== currentUserId && p.role !== 'OWNER')
                    return (
                      <li
                        key={p.id}
                        className="grid min-h-10 grid-cols-[2rem_1fr_2rem] items-center gap-2 px-1 py-0.5"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs">{label.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm">{label}</span>
                          {isOwner ? (
                            <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold leading-none text-amber-900">
                              Quản trị viên
                            </span>
                          ) : null}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-end">
                          {canPromote ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  aria-label={`Thao tác ${label}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-48">
                                <DropdownMenuItem
                                  disabled={transferMut.isPending}
                                  onClick={() => setPromoteTarget({ id: p.id, name: label })}
                                >
                                  Phong quản trị viên
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="shrink-0" aria-hidden />
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={pinsOpen} onToggle={() => setPinsOpen((o) => !o)}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  <Pin className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                  Tin đã ghim
                  <span className="text-xs font-normal text-muted-foreground">
                    ({pins.length}/{MAX_PINS_PER_CONVERSATION})
                  </span>
                </span>
              </CollapsibleHeader>
              {pinsOpen ? (
                pins.length === 0 ? (
                  <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có tin ghim.</p>
                ) : (
                  <ul className="space-y-1.5 pb-3">
                    {pins.map((p) => (
                      <li key={p.messageId}>
                        <button
                          type="button"
                          onClick={() => onPinnedMessageClick?.(p.messageId)}
                          className={cn(
                            'w-full rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-left text-[13px] transition-colors',
                            onPinnedMessageClick && 'hover:bg-accent'
                          )}
                          disabled={!onPinnedMessageClick}
                        >
                          <span className="line-clamp-2 text-foreground">{p.preview}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {p.sender.displayName?.trim() || p.sender.username}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={mediaOpen} onToggle={() => setMediaOpen((o) => !o)}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  Ảnh/Video
                </span>
              </CollapsibleHeader>
              {mediaOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có ảnh hoặc video trong hội thoại.</p>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={filesOpen} onToggle={() => setFilesOpen((o) => !o)}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  File
                </span>
              </CollapsibleHeader>
              {filesOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có file được chia sẻ.</p>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={linksOpen} onToggle={() => setLinksOpen((o) => !o)}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  Link
                </span>
              </CollapsibleHeader>
              {linksOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có liên kết trong hội thoại.</p>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={false} onToggle={() => {}}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  Thiết lập bảo mật
                </span>
              </CollapsibleHeader>
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={false} onToggle={() => {}}>
                <span className="flex items-center gap-3 font-normal text-foreground">
                  <AlertTriangle className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                  Báo xấu
                </span>
              </CollapsibleHeader>
            </div>

            <div className="py-2">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] font-normal text-destructive transition-colors hover:bg-muted/30"
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                Xoá lịch sử trò chuyện
              </button>
            </div>

            {room.type === 'GROUP' && isGroupOwner ? (
              <div className="border-t border-border/40 pb-3 pt-3 px-3">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={disbandMut.isPending}
                  onClick={() => setDisbandDialogOpen(true)}
                >
                  {disbandMut.isPending ? 'Đang xử lý…' : 'Giải tán nhóm'}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <DisbandGroupConfirmDialog
        open={disbandDialogOpen}
        onOpenChange={setDisbandDialogOpen}
        onConfirm={() => disbandMut.mutate()}
        isPending={disbandMut.isPending}
      />
      <PromoteAdminConfirmDialog
        open={promoteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPromoteTarget(null)
        }}
        memberName={promoteTarget?.name ?? ''}
        onConfirm={() => {
          if (promoteTarget) transferMut.mutate(promoteTarget.id)
        }}
        isPending={transferMut.isPending}
      />
    </div>
  )
}

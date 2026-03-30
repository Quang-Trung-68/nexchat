import { ChevronDown, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { cn } from '@/lib/utils'
import { userDisplayName } from '@/lib/userDisplay'

type ChatRightPanelProps = {
  room: RoomListItem
  currentUserId: string | undefined
  onClose: () => void
}

export function ChatRightPanel({ room, currentUserId, onClose }: ChatRightPanelProps) {
  const title = getRoomTitle(room, currentUserId)
  const initial = title.slice(0, 1).toUpperCase()

  return (
    <div className="flex h-full w-full max-w-[320px] shrink-0 flex-col border-l border-border bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Thông tin hội thoại</span>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Đóng panel">
          <PanelRightClose className="h-5 w-5" />
        </Button>
      </div>

      <div className="shrink-0 px-4 pt-6 text-center">
        <Avatar className="mx-auto h-20 w-20">
          <AvatarFallback className="text-xl font-medium">{initial}</AvatarFallback>
        </Avatar>
        <h2 className="mt-3 text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">
          {room.type === 'GROUP' ? `${room.participants.length} thành viên` : 'Hội thoại 1–1'}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 px-3">
        {['Tắt TB', 'Ghim', 'Nhóm'].map((label, i) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="flex h-auto flex-col gap-1 py-2 text-[10px] text-muted-foreground"
          >
            <span className="text-sm">{i === 0 ? '🔕' : i === 1 ? '📌' : '👥'}</span>
            {label}
          </Button>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between px-0 py-2 text-left text-sm font-medium'
          )}
        >
          Thành viên ({room.participants.length})
          <ChevronDown className="h-4 w-4" />
        </button>
        <ul className="space-y-2 pt-1">
          {room.participants.map((p) => {
            const label = userDisplayName(p)
            return (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-xs">{label.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{label}</span>
              </li>
            )
          })}
        </ul>

        <Separator className="my-4" />

        <p className="text-xs text-muted-foreground">
          Ảnh / video / file — tính năng tải lên sẽ có ở bước tiếp theo (Bước 11).
        </p>
      </div>
    </div>
  )
}

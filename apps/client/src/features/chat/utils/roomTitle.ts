import type { RoomListItem } from '@/features/rooms/types/room.types'
import { userDisplayName } from '@/lib/userDisplay'

export function getRoomTitle(room: RoomListItem, currentUserId: string | undefined): string {
  if (room.type === 'GROUP' && room.name) return room.name
  const other = room.participants.find((p) => p.id !== currentUserId)
  if (other) return userDisplayName(other)
  return room.name ?? 'Hội thoại'
}

/** DM: @username của đối phương — chỉ hiện dưới header. */
export function getDmMentionLine(room: RoomListItem, currentUserId: string | undefined): string | null {
  if (room.type !== 'DM') return null
  const other = room.participants.find((p) => p.id !== currentUserId)
  if (!other) return null
  return `@${other.username}`
}

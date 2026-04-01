import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { roomsKeys } from '../rooms.keys'
import type { RoomListItem } from '../types/room.types'

type ParticipantRow = RoomListItem['participants'][number] & { display_name?: string | null }

function normalizeParticipant(p: ParticipantRow): RoomListItem['participants'][number] {
  const d = (p.displayName ?? p.display_name)?.trim()
  return {
    id: p.id,
    username: p.username,
    ...(d ? { displayName: d } : {}),
    avatarUrl: p.avatarUrl ?? null,
  }
}

function normalizeRoomListItem(room: RoomListItem): RoomListItem {
  return {
    ...room,
    participants: room.participants.map((x) => normalizeParticipant(x as ParticipantRow)),
  }
}

export function useRoomsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const emailVerified = useAuthStore((s) => !!s.user?.emailVerifiedAt)
  return useQuery({
    queryKey: roomsKeys.all,
    enabled: isAuthenticated && emailVerified,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: RoomListItem[] }>('/rooms')
      return data.data.map(normalizeRoomListItem)
    },
  })
}

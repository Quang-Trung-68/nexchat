/** Khớp GET /api/rooms item (JSON). */
export interface RoomListItem {
  id: string
  name: string | null
  type: 'DM' | 'GROUP'
  createdAt: string
  participants: {
    id: string
    username: string
    displayName?: string
    avatarUrl: string | null
  }[]
  lastMessage: {
    id: string
    content: string | null
    senderId: string
    createdAt: string
    fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
  } | null
  unreadCount: number
}

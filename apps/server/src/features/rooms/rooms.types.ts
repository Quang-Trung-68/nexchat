import type { ConversationType } from '@prisma/client'

export interface RoomParticipantDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface LastMessageDto {
  id: string
  content: string | null
  senderId: string
  createdAt: Date
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
}

export interface RoomListItemDto {
  id: string
  name: string | null
  type: ConversationType
  createdAt: Date
  participants: RoomParticipantDto[]
  lastMessage: LastMessageDto | null
  unreadCount: number
}

export interface CreateGroupBody {
  name: string
  participantIds: string[]
}

export interface CreatedRoomDto {
  id: string
  name: string | null
  type: ConversationType
  createdAt: Date
  participants: Array<RoomParticipantDto & { role: string }>
}

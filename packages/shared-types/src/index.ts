// Re-export Prisma enums for use in both frontend and backend
export {
  ConversationType,
  ParticipantRole,
  MessageType,
  FriendshipStatus,
  NotificationType,
  OAuthProvider,
} from '@prisma/client'

// ─── DTO Types for API Responses ─────────────────────────────────────────────

import type {
  ConversationType,
  ParticipantRole,
  MessageType,
  FriendshipStatus,
  NotificationType,
} from '@prisma/client'

export interface UserDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  isOnline: boolean
  lastSeenAt: Date
}

export interface ConversationDto {
  id: string
  type: ConversationType
  name: string | null
  avatarUrl: string | null
  description: string | null
  lastMessage: MessageDto | null
  unreadCount: number
  participants: ParticipantDto[]
  updatedAt: Date
}

export interface ParticipantDto {
  id: string
  userId: string
  role: ParticipantRole
  user: UserDto
  joinedAt: Date
}

export interface MessageDto {
  id: string
  conversationId: string
  senderId: string
  sender: UserDto
  type: MessageType
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  parentId: string | null
  parent: MessageDto | null
  reactions: ReactionDto[]
  reads: MessageReadDto[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ReactionDto {
  id: string
  messageId: string
  userId: string
  user: UserDto
  emoji: string
}

export interface MessageReadDto {
  userId: string
  readAt: Date
}

export interface FriendshipDto {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendshipStatus
  requester: UserDto
  addressee: UserDto
  createdAt: Date
}

export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  data: Record<string, unknown> | null
  createdAt: Date
}

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  code?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

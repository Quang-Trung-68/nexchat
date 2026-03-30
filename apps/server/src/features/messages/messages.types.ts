import type { MessageType } from '@prisma/client'

export type ApiFileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

export interface MessageSenderDto {
  id: string
  username: string
  avatarUrl: string | null
}

export interface MessageItemDto {
  id: string
  content: string | null
  fileUrl: string | null
  fileType: ApiFileType | null
  createdAt: Date
  parentMessageId: string | null
  sender: MessageSenderDto
}

export interface MessagesPageDto {
  messages: MessageItemDto[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreateMessageBody {
  content?: string
  fileUrl?: string
  fileType?: ApiFileType
  parentMessageId?: string
}

/** Map persisted MessageType → API fileType (không có migration thêm cột). */
export function messageTypeToApiFileType(type: MessageType): ApiFileType | null {
  if (type === 'IMAGE') return 'IMAGE'
  if (type === 'FILE') return 'DOCUMENT'
  return null
}

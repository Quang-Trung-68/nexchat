import type { MessageType } from '@prisma/client'

export type ApiFileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

export interface MessageSenderDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface MessageAttachmentDto {
  id: string
  url: string
  sortOrder: number
}

export interface ReactionSummaryDto {
  emoji: string
  count: number
}

/** Payload broadcast `chat:reaction:updated` — client gom summary + tính `myReactionEmoji` từ `reactions`. */
export interface ReactionUpdatedPayload {
  conversationId: string
  messageId: string
  summary: ReactionSummaryDto[]
  reactions: { userId: string; emoji: string }[]
}

export interface MessageItemDto {
  id: string
  content: string | null
  fileUrl: string | null
  fileType: ApiFileType | null
  /** Ảnh đính kèm (Cloudinary); có thể rỗng nếu chỉ text hoặc chưa upload xong. */
  attachments: MessageAttachmentDto[]
  /** Gom theo emoji; viewer-specific qua `myReactionEmoji`. */
  reactionSummary: ReactionSummaryDto[]
  /** Reaction hiện tại của user đang xem (một user / một emoji / message). */
  myReactionEmoji: string | null
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
  /** Số ảnh user sẽ gửi tiếp theo (preview trong RAM); cho phép tin không text. */
  plannedImageCount?: number
}

/** Map persisted MessageType → API fileType (tin đơn lẻ legacy). */
export function messageTypeToApiFileType(type: MessageType): ApiFileType | null {
  if (type === 'IMAGE') return 'IMAGE'
  if (type === 'FILE') return 'DOCUMENT'
  return null
}

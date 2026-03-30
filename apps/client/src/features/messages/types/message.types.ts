/** Khớp payload `chat:new` / REST message item. */
export interface MessageSenderDto {
  id: string
  username: string
  /** Tên hiển thị — khớp server; fallback username nếu thiếu (socket cũ). */
  displayName?: string
  avatarUrl: string | null
}

export interface MessageAttachmentDto {
  id: string
  url: string
  sortOrder: number
}

export interface MessageItemDto {
  id: string
  content: string | null
  fileUrl: string | null
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
  attachments: MessageAttachmentDto[]
  createdAt: string
  parentMessageId: string | null
  sender: MessageSenderDto
}

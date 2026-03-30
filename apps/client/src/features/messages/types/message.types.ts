/** Khớp payload `chat:new` / REST message item. */
export interface MessageSenderDto {
  id: string
  username: string
  avatarUrl: string | null
}

export interface MessageItemDto {
  id: string
  content: string | null
  fileUrl: string | null
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
  createdAt: string
  parentMessageId: string | null
  sender: MessageSenderDto
}

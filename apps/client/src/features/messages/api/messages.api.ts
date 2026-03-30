import { api } from '@/services/api'
import { normalizeMessageSender, type MessageSenderPayload } from '@/lib/messageSender'
import type { MessageItemDto } from '../types/message.types'

export type CreateMessagePayload = {
  content?: string
  plannedImageCount?: number
  parentMessageId?: string
}

export interface MessagesPageDto {
  messages: MessageItemDto[]
  nextCursor: string | null
  hasMore: boolean
}

export async function createMessage(
  conversationId: string,
  body: CreateMessagePayload
): Promise<MessageItemDto> {
  const { data } = await api.post<{ success: boolean; data: MessageItemDto }>(
    `/rooms/${conversationId}/messages`,
    body
  )
  return normalizeMessagePayload(data.data)
}

export async function fetchMessagesPage(
  conversationId: string,
  cursor: string | undefined,
  limit = 30
): Promise<MessagesPageDto> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('limit', String(limit))
  const { data } = await api.get<{ success: boolean; data: MessagesPageDto }>(
    `/rooms/${conversationId}/messages?${params}`
  )
  return data.data
}

export function normalizeMessagePayload(m: MessageItemDto): MessageItemDto {
  return {
    ...m,
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
    sender: normalizeMessageSender(m.sender as MessageSenderPayload),
  }
}

export async function uploadMessageImages(messageId: string, files: File[]): Promise<MessageItemDto> {
  const fd = new FormData()
  for (const f of files) {
    fd.append('images', f, f.name)
  }
  const { data } = await api.post<{ success: boolean; data: MessageItemDto }>(
    `/messages/${messageId}/images`,
    fd
  )
  return normalizeMessagePayload(data.data)
}

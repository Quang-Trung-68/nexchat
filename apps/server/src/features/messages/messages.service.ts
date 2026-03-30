import { MessageType as MT } from '@prisma/client'
import { AppError } from '@/shared/errors/AppError'
import { messagesRepository } from './messages.repository'
import {
  messageTypeToApiFileType,
  type CreateMessageBody,
  type MessageItemDto,
  type MessagesPageDto,
} from './messages.types'

function resolveMessageType(body: CreateMessageBody): MT {
  const hasFile = body.fileUrl !== undefined && body.fileUrl.trim().length > 0
  if (hasFile) {
    if (body.fileType === 'IMAGE') return MT.IMAGE
    return MT.FILE
  }
  return MT.TEXT
}

export const messagesService = {
  async listMessages(
    userId: string,
    conversationId: string,
    query: { cursor?: string; limit: number }
  ): Promise<MessagesPageDto> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền truy cập room này', 403, 'FORBIDDEN')
    }

    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const cursorMsg = await messagesRepository.findMessageMeta(query.cursor)
      if (
        !cursorMsg ||
        cursorMsg.conversationId !== conversationId ||
        cursorMsg.deletedAt !== null
      ) {
        throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
      }
      cursorCreatedAt = cursorMsg.createdAt
      cursorId = cursorMsg.id
    }

    const rows = await messagesRepository.findMessagesPage({
      conversationId,
      cursorCreatedAt,
      cursorId,
      limit: query.limit,
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const nextCursor =
      hasMore && slice.length > 0 ? slice[slice.length - 1].id : null

    const messages: MessageItemDto[] = slice.map((m) => ({
      id: m.id,
      content: m.content,
      fileUrl: m.fileUrl,
      fileType: messageTypeToApiFileType(m.type),
      createdAt: m.createdAt,
      parentMessageId: m.parentId,
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        avatarUrl: m.sender.avatarUrl,
      },
    }))

    return { messages, nextCursor, hasMore }
  },

  async createMessage(
    userId: string,
    conversationId: string,
    body: CreateMessageBody
  ): Promise<MessageItemDto> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền truy cập room này', 403, 'FORBIDDEN')
    }

    if (body.parentMessageId) {
      const parent = await messagesRepository.findMessageMeta(body.parentMessageId)
      if (
        !parent ||
        parent.conversationId !== conversationId ||
        parent.deletedAt !== null
      ) {
        throw new AppError('Tin nhắn reply không thuộc room này', 400, 'INVALID_PARENT_MESSAGE')
      }
    }

    const type = resolveMessageType(body)
    const content =
      body.content !== undefined && body.content.trim().length > 0
        ? body.content.trim()
        : null

    const created = await messagesRepository.createMessage({
      conversationId,
      senderId: userId,
      type,
      content,
      fileUrl: body.fileUrl?.trim() ?? null,
      fileName: null,
      fileSize: null,
      parentId: body.parentMessageId ?? null,
    })

    return {
      id: created.id,
      content: created.content,
      fileUrl: created.fileUrl,
      fileType: body.fileType ?? messageTypeToApiFileType(created.type),
      createdAt: created.createdAt,
      parentMessageId: created.parentId,
      sender: {
        id: created.sender.id,
        username: created.sender.username,
        avatarUrl: created.sender.avatarUrl,
      },
    }
  },
}

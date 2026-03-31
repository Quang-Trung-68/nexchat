import { MessageType as MT } from '@prisma/client'
import { uploadImageBufferToCloudinary, ensureCloudinaryConfigured } from '@/config/cloudinary.client'
import { getUploadConfig } from '@/config/upload.config'
import { AppError } from '@/shared/errors/AppError'
import { messagesRepository } from './messages.repository'
import {
  messageTypeToApiFileType,
  type CreateMessageBody,
  type MessageItemDto,
  type MessagesPageDto,
  type ReactionSummaryDto,
  type ReactionUpdatedPayload,
} from './messages.types'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function reactionSummaryOnly(reactions: { userId: string; emoji: string; createdAt: Date }[]): ReactionSummaryDto[] {
  const byEmoji = new Map<string, { count: number; lastAt: number }>()
  for (const r of reactions) {
    const t = r.createdAt.getTime()
    const cur = byEmoji.get(r.emoji)
    if (!cur) {
      byEmoji.set(r.emoji, { count: 1, lastAt: t })
    } else {
      cur.count += 1
      if (t > cur.lastAt) cur.lastAt = t
    }
  }
  return [...byEmoji.entries()]
    .sort((a, b) => b[1].lastAt - a[1].lastAt || a[0].localeCompare(b[0]))
    .map(([emoji, { count }]) => ({ emoji, count }))
}

export function buildReactionSummaryFromRows(
  reactions: { userId: string; emoji: string; createdAt: Date }[],
  viewerId: string
): { reactionSummary: ReactionSummaryDto[]; myReactionEmoji: string | null } {
  return {
    reactionSummary: reactionSummaryOnly(reactions),
    myReactionEmoji: reactions.find((r) => r.userId === viewerId)?.emoji ?? null,
  }
}

function buildReactionBroadcastPayload(
  conversationId: string,
  messageId: string,
  reactions: { userId: string; emoji: string; createdAt: Date }[]
): ReactionUpdatedPayload {
  const summary = reactionSummaryOnly(reactions)
  const reactionsPayload = reactions.map(({ userId, emoji }) => ({ userId, emoji }))
  return {
    conversationId,
    messageId,
    summary,
    reactions: reactionsPayload,
  }
}

function resolveMessageType(body: CreateMessageBody): MT {
  const hasFile = body.fileUrl !== undefined && body.fileUrl.trim().length > 0
  if (hasFile) {
    if (body.fileType === 'IMAGE') return MT.IMAGE
    return MT.FILE
  }
  const planned = body.plannedImageCount ?? 0
  if (planned > 0) {
    const hasText = body.content !== undefined && body.content.trim().length > 0
    return hasText ? MT.TEXT : MT.IMAGE
  }
  return MT.TEXT
}

function mapRowToDto(
  m: {
    id: string
    content: string | null
    fileUrl: string | null
    type: MT
    createdAt: Date
    parentId: string | null
    sender: {
      id: string
      username: string
      displayName: string
      avatarUrl: string | null
    }
    attachments: { id: string; url: string; sortOrder: number }[]
    reactions: { userId: string; emoji: string; createdAt: Date }[]
  },
  viewerId: string
): MessageItemDto {
  const { reactionSummary, myReactionEmoji } = buildReactionSummaryFromRows(m.reactions, viewerId)
  return {
    id: m.id,
    content: m.content,
    fileUrl: m.fileUrl,
    fileType: messageTypeToApiFileType(m.type),
    attachments: m.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      sortOrder: a.sortOrder,
    })),
    reactionSummary,
    myReactionEmoji,
    createdAt: m.createdAt,
    parentMessageId: m.parentId,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      displayName: m.sender.displayName,
      avatarUrl: m.sender.avatarUrl,
    },
  }
}

export const messagesService = {
  mapRowToDto,

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

    const messages: MessageItemDto[] = slice.map((m) => mapRowToDto(m, userId))

    return { messages, nextCursor, hasMore }
  },

  async createMessage(
    userId: string,
    conversationId: string,
    body: CreateMessageBody
  ): Promise<MessageItemDto> {
    const cfg = getUploadConfig()
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

    const planned = body.plannedImageCount ?? 0
    if (planned > cfg.maxImagesPerMessage) {
      throw new AppError(
        `Tối đa ${cfg.maxImagesPerMessage} ảnh mỗi tin`,
        400,
        'PLANNED_IMAGES_EXCEEDED'
      )
    }

    if (body.plannedImageCount !== undefined && body.plannedImageCount < 0) {
      throw new AppError('plannedImageCount không hợp lệ', 400, 'VALIDATION_ERROR')
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

    return mapRowToDto(created, userId)
  },

  async setReaction(
    userId: string,
    messageId: string,
    emoji: string
  ): Promise<{ payload: ReactionUpdatedPayload; myReactionEmoji: string | null }> {
    const meta = await messagesRepository.findMessageMeta(messageId)
    if (!meta || meta.deletedAt !== null) {
      throw new AppError('Không tìm thấy tin nhắn', 404, 'NOT_FOUND')
    }
    const conversationId = meta.conversationId
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong hội thoại này', 403, 'FORBIDDEN')
    }

    const existing = await messagesRepository.findReactionByMessageAndUser(messageId, userId)
    if (!existing) {
      await messagesRepository.createReaction(messageId, userId, emoji)
    } else if (existing.emoji === emoji) {
      await messagesRepository.deleteReactionById(existing.id)
    } else {
      await messagesRepository.updateReactionEmoji(existing.id, emoji)
    }

    const rows = await messagesRepository.listReactionsForMessage(messageId)
    const payload = buildReactionBroadcastPayload(conversationId, messageId, rows)
    const myReactionEmoji = rows.find((r) => r.userId === userId)?.emoji ?? null
    return { payload, myReactionEmoji }
  },

  async uploadMessageImages(
    userId: string,
    messageId: string,
    files: Express.Multer.File[]
  ): Promise<{ message: MessageItemDto; conversationId: string }> {
    if (!files.length) {
      throw new AppError('Không có file', 400, 'VALIDATION_ERROR')
    }

    const cfg = getUploadConfig()
    if (!ensureCloudinaryConfigured()) {
      throw new AppError('Chưa cấu hình Cloudinary', 503, 'CLOUDINARY_UNAVAILABLE')
    }

    const row = await messagesRepository.findMessageForUpload(messageId, userId)
    if (!row) {
      throw new AppError('Không tìm thấy tin nhắn hoặc không phải tin của bạn', 404, 'NOT_FOUND')
    }

    const conversationId = row.conversationId

    const remaining = cfg.maxImagesPerMessage - row._count.attachments
    if (remaining <= 0) {
      throw new AppError('Đã đủ số ảnh cho tin này', 400, 'ATTACHMENT_LIMIT')
    }
    if (files.length > remaining) {
      throw new AppError(
        `Chỉ còn chỗ cho ${remaining} ảnh`,
        400,
        'TOO_MANY_FILES'
      )
    }

    for (const f of files) {
      if (!IMAGE_MIMES.has(f.mimetype)) {
        throw new AppError(`Định dạng không hỗ trợ: ${f.mimetype}`, 400, 'INVALID_MIME')
      }
      if (f.size > cfg.maxImageBytesPerFile) {
        throw new AppError(
          `Ảnh vượt dung lượng (${cfg.maxImageBytesPerFile} bytes)`,
          400,
          'FILE_TOO_LARGE'
        )
      }
    }

    const folder = `chat/${conversationId}/${messageId}`
    const startOrder = row._count.attachments
    const uploads: { url: string; sortOrder: number }[] = []

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImageBufferToCloudinary(files[i].buffer, folder)
      uploads.push({ url, sortOrder: startOrder + i })
    }

    await messagesRepository.createAttachments(messageId, uploads)

    const full = await messagesRepository.findMessageByIdWithListShape(messageId)
    if (!full) {
      throw new AppError('Không tải lại được tin sau upload', 500, 'INTERNAL_ERROR')
    }

    return { message: mapRowToDto(full, userId), conversationId }
  },
}

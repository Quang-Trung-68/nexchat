import type { MessageType } from '@prisma/client'
import { prisma } from '@/config/prisma'

const senderSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

const attachmentSelect = {
  id: true,
  url: true,
  sortOrder: true,
} as const

const messageListSelect = {
  id: true,
  content: true,
  fileUrl: true,
  type: true,
  createdAt: true,
  parentId: true,
  sender: { select: senderSelect },
  attachments: {
    orderBy: { sortOrder: 'asc' as const },
    select: attachmentSelect,
  },
} as const

export const messagesRepository = {
  findParticipant(userId: string, conversationId: string) {
    return prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  findMessageMeta(messageId: string) {
    return prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        createdAt: true,
        deletedAt: true,
      },
    })
  },

  findMessageForUpload(messageId: string, senderId: string) {
    return prisma.message.findFirst({
      where: {
        id: messageId,
        senderId,
        deletedAt: null,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        _count: { select: { attachments: true } },
      },
    })
  },

  findMessagesPage(params: {
    conversationId: string
    cursorCreatedAt?: Date
    cursorId?: string
    limit: number
  }) {
    const { conversationId, cursorCreatedAt, cursorId, limit } = params
    const take = limit + 1

    const where = {
      conversationId,
      deletedAt: null as null,
      ...(cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              {
                AND: [{ createdAt: cursorCreatedAt }, { id: { lt: cursorId } }],
              },
            ],
          }
        : {}),
    }

    return prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: messageListSelect,
    })
  },

  findMessageByIdWithListShape(messageId: string) {
    return prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
      select: messageListSelect,
    })
  },

  createMessage(input: {
    conversationId: string
    senderId: string
    type: MessageType
    content: string | null
    fileUrl: string | null
    fileName: string | null
    fileSize: number | null
    parentId: string | null
  }) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        type: input.type,
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        parentId: input.parentId,
      },
      select: messageListSelect,
    })
  },

  createAttachments(
    messageId: string,
    items: { url: string; sortOrder: number }[]
  ) {
    return prisma.messageAttachment.createMany({
      data: items.map((row) => ({
        messageId,
        url: row.url,
        sortOrder: row.sortOrder,
      })),
    })
  },
}

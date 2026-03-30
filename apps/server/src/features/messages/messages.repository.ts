import type { MessageType } from '@prisma/client'
import { prisma } from '@/config/prisma'

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
      select: {
        id: true,
        content: true,
        fileUrl: true,
        type: true,
        createdAt: true,
        parentId: true,
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
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
      select: {
        id: true,
        content: true,
        fileUrl: true,
        type: true,
        createdAt: true,
        parentId: true,
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })
  },
}

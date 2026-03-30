import type { MessageType, ParticipantRole } from '@prisma/client'
import { prisma } from '@/config/prisma'

export const roomsRepository = {
  findMembershipRowsForUser(userId: string) {
    return prisma.conversationParticipant.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    })
  },

  findParticipantsForConversations(conversationIds: string[]) {
    if (conversationIds.length === 0) return Promise.resolve([])
    return prisma.conversationParticipant.findMany({
      where: {
        conversationId: { in: conversationIds },
        deletedAt: null,
      },
      select: {
        conversationId: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })
  },

  findConversationsByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([])
    return prisma.conversation.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    })
  },

  async findLastMessagePerConversation(conversationIds: string[]) {
    type LastRow = {
      id: string
      conversationId: string
      content: string | null
      senderId: string
      createdAt: Date
      type: MessageType
    }
    if (conversationIds.length === 0) return new Map<string, LastRow>()
    const rows = await Promise.all(
      conversationIds.map((conversationId) =>
        prisma.message.findFirst({
          where: { conversationId, deletedAt: null },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            conversationId: true,
            content: true,
            senderId: true,
            createdAt: true,
            type: true,
          },
        })
      )
    )
    const map = new Map<string, LastRow>()
    conversationIds.forEach((convId, i) => {
      const m = rows[i]
      if (m) map.set(convId, m)
    })
    return map
  },

  countUnreadMessages(conversationId: string, lastReadAt: Date) {
    return prisma.message.count({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: { gt: lastReadAt },
      },
    })
  },

  findUsersByIds(ids: string[]) {
    return prisma.user.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: { id: true },
    })
  },

  createGroupWithParticipants(input: {
    name: string
    creatorId: string
    memberIds: string[]
  }) {
    const { name, creatorId, memberIds } = input
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          type: 'GROUP',
          name,
        },
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
        },
      })

      await tx.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: creatorId,
          role: 'OWNER' as ParticipantRole,
        },
      })

      await tx.conversationParticipant.createMany({
        data: memberIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: 'MEMBER' as ParticipantRole,
        })),
      })

      const participants = await tx.conversationParticipant.findMany({
        where: { conversationId: conversation.id, deletedAt: null },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      })

      return { conversation, participants }
    })
  },
}

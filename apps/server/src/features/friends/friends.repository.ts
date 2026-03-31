import { ParticipantRole } from '@prisma/client'
import { prisma } from '@/config/prisma'

export const friendsRepository = {
  async findDmConversationIdBetweenUsers(a: string, b: string): Promise<string | null> {
    const convs = await prisma.conversation.findMany({
      where: {
        type: 'DM',
        deletedAt: null,
        participants: {
          some: { userId: a, deletedAt: null },
        },
      },
      select: {
        id: true,
        participants: {
          where: { deletedAt: null },
          select: { userId: true },
        },
      },
    })
    for (const c of convs) {
      const ids = new Set(c.participants.map((p) => p.userId))
      if (ids.size === 2 && ids.has(a) && ids.has(b)) return c.id
    }
    return null
  },

  async createDmConversation(userA: string, userB: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: { type: 'DM', name: null, avatarUrl: null },
      })
      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: conv.id,
            userId: userA,
            role: ParticipantRole.MEMBER,
          },
          {
            conversationId: conv.id,
            userId: userB,
            role: ParticipantRole.MEMBER,
          },
        ],
      })
      return conv.id
    })
  },
}

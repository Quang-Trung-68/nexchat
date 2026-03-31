import { prisma } from '@/config/prisma'

const userPublic = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

export const usersService = {
  listUsersExcludingSelf(currentUserId: string) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { not: currentUserId },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: { username: 'asc' },
      take: 100,
    })
  },

  /** Khớp chính xác username hoặc email hoặc phone — không gợi ý / không LIKE. */
  async lookupExactUser(currentUserId: string, q: string) {
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ username: q }, { email: q }, { phone: q }],
      },
      select: userPublic,
    })
    if (!user || user.id === currentUserId) {
      return { user: null }
    }
    return { user }
  },
}

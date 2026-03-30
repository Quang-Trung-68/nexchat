import { prisma } from '@/config/prisma'

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
}

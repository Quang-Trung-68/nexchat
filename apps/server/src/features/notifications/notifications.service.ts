import { prisma } from '@/config/prisma'
import type { NotificationItemDto } from './notifications.types'

function mapRow(n: {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  data: unknown
  createdAt: Date
}): NotificationItemDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    data: n.data && typeof n.data === 'object' && n.data !== null ? (n.data as Record<string, unknown>) : null,
    createdAt: n.createdAt.toISOString(),
  }
}

export const notificationsService = {
  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    })
  },

  async list(userId: string, limit = 40): Promise<NotificationItemDto[]> {
    const rows = await prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        data: true,
        createdAt: true,
      },
    })
    return rows.map(mapRow)
  },

  async markRead(userId: string, notificationId: string): Promise<boolean> {
    const r = await prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { isRead: true },
    })
    return r.count > 0
  },

  async markAllRead(userId: string): Promise<number> {
    const r = await prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true },
    })
    return r.count
  },
}

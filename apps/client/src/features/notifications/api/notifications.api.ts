import { api } from '@/services/api'

export type NotificationItemDto = {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  data: Record<string, unknown> | null
  createdAt: string
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ success: boolean; data: { count: number } }>(
    '/notifications/unread-count'
  )
  return data.data.count
}

export async function fetchNotificationsList(limit = 40): Promise<NotificationItemDto[]> {
  const { data } = await api.get<{ success: boolean; data: { items: NotificationItemDto[] } }>(
    `/notifications?limit=${limit}`
  )
  return data.data.items
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}

export type NotificationItemDto = {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  data: Record<string, unknown> | null
  createdAt: string
}

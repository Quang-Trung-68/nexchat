import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { notificationUnreadKeys, notificationListKeys } from '../queries/notificationQueryKeys'
import { useNewsfeedPendingStore } from '@/features/newsfeed/store/newsfeedPending.store'

type NotificationNewPayload = {
  notificationId?: string
  type?: string
  title?: string
  body?: string
  postId?: string
  authorId?: string
}

export function useNotificationRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket || !connected) return

    const onNew = (payload: NotificationNewPayload) => {
      void queryClient.invalidateQueries({ queryKey: notificationUnreadKeys.count })
      void queryClient.invalidateQueries({ queryKey: notificationListKeys.list })
      if (payload?.type === 'NEW_FRIEND_POST') {
        useNewsfeedPendingStore.getState().bump()
      }
    }

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, onNew)

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, onNew)
    }
  }, [socket, connected, queryClient])
}

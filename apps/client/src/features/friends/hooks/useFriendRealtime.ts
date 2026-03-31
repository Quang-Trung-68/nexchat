import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { friendsKeys } from '@/features/friends/friends.keys'
import { roomsKeys } from '@/features/rooms/rooms.keys'

export function useFriendRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket || !connected) return

    const onIncoming = () => {
      void queryClient.invalidateQueries({ queryKey: friendsKeys.pending() })
      void queryClient.invalidateQueries({ queryKey: friendsKeys.accepted() })
    }

    const onUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: friendsKeys.pending() })
      void queryClient.invalidateQueries({ queryKey: friendsKeys.accepted() })
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    }

    socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onIncoming)
    socket.on(SOCKET_EVENTS.FRIEND_UPDATED, onUpdated)

    return () => {
      socket.off(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onIncoming)
      socket.off(SOCKET_EVENTS.FRIEND_UPDATED, onUpdated)
    }
  }, [socket, connected, queryClient])
}

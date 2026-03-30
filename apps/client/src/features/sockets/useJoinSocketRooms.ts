import { useEffect, useRef } from 'react'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { useSocket } from '@/features/sockets/useSocket'
import type { RoomListItem } from '@/features/rooms/types/room.types'

/**
 * Đồng bộ membership mới với Socket.IO room (sau tạo nhóm / user khác thêm bạn) — join idempotent.
 */
export function useJoinSocketRooms(rooms: RoomListItem[] | undefined) {
  const { socket, connected } = useSocket()
  const lastSigRef = useRef<string>('')

  useEffect(() => {
    if (!socket || !connected) return
    if (!rooms?.length) {
      lastSigRef.current = ''
      return
    }
    const sig = rooms
      .map((r) => r.id)
      .sort()
      .join(',')
    if (sig === lastSigRef.current) return
    lastSigRef.current = sig
    for (const r of rooms) {
      socket.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId: r.id })
    }
  }, [socket, connected, rooms])
}

import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { RoomListItem } from '@/features/rooms/types/room.types'

/**
 * Đồng bộ membership mới với Socket.IO room (sau tạo nhóm / user khác thêm bạn) — join idempotent.
 * Phải dùng **cùng** `socket` instance với `useChatRealtime` / typing (một `useSocket()` = một kết nối).
 */
export function useJoinSocketRooms(
  socket: Socket | null,
  connected: boolean,
  rooms: RoomListItem[] | undefined,
) {
  const lastSigRef = useRef<string>('')

  useEffect(() => {
    if (!socket || !connected) {
      if (!connected) lastSigRef.current = ''
      return
    }
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

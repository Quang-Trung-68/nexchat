import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { useSocket } from '@/features/sockets/useSocket'
import { useJoinSocketRooms } from '@/features/sockets/useJoinSocketRooms'
import { useChatRealtime } from '@/features/messages/hooks/useChatRealtime'
import { useTypingPresenceRealtime } from '@/features/sockets/useTypingPresenceRealtime'
import { useReceiptRealtime } from '@/features/rooms/hooks/useReceiptRealtime'
import { useFriendRealtime } from '@/features/friends/hooks/useFriendRealtime'

/** Một kết nối Socket.IO + realtime chat + typing/presence + read receipts + bạn bè. `useRoomReadSync` gọi trong `ChatThread`. */
export function SocketBootstrap() {
  const { socket, connected } = useSocket()
  const { data: rooms } = useRoomsQuery()
  useJoinSocketRooms(socket, connected, rooms)
  useChatRealtime(socket, connected)
  useTypingPresenceRealtime(socket, connected)
  useReceiptRealtime(socket, connected)
  useFriendRealtime(socket, connected)
  return null
}

import { useSocket } from '@/features/sockets/useSocket'
import { useChatRealtime } from '@/features/messages/hooks/useChatRealtime'
import { useTypingPresenceRealtime } from '@/features/sockets/useTypingPresenceRealtime'
import { useReceiptRealtime } from '@/features/rooms/hooks/useReceiptRealtime'

/** Một kết nối Socket.IO + realtime chat + typing/presence + read receipts. `useRoomReadSync` gọi trong `ChatThread`. */
export function SocketBootstrap() {
  const { socket, connected } = useSocket()
  useChatRealtime(socket, connected)
  useTypingPresenceRealtime(socket, connected)
  useReceiptRealtime(socket, connected)
  return null
}

import { useSocket } from '@/features/sockets/useSocket'
import { useChatRealtime } from '@/features/messages/hooks/useChatRealtime'

/** Một kết nối Socket.IO + realtime chat (Bước 6–7). */
export function SocketBootstrap() {
  const { socket, connected } = useSocket()
  useChatRealtime(socket, connected)
  return null
}

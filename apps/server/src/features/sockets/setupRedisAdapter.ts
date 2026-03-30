import { createAdapter } from '@socket.io/redis-adapter'
import type { Server } from 'socket.io'
import { getRedisAdapterClients, isRedisAdapterActive } from '@/config/redis'

export function attachRedisAdapter(io: Server): void {
  if (!isRedisAdapterActive()) {
    console.warn('[Socket.IO] Bỏ qua redis-adapter (một process, không cần Redis).')
    return
  }
  const { pubClient, subClient } = getRedisAdapterClients()
  io.adapter(createAdapter(pubClient, subClient))
}

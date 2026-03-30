import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { env } from '@/config/env'
import { registerSocketAuthMiddleware } from './socketAuth.middleware'
import { registerChatSocketHandlers } from './chatHandlers'
import { joinConversationRoomsForSocket } from './joinUserRooms'
import './socket.types'

export let io: Server

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    path: '/ws',
    transports: ['websocket', 'polling'],
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  })

  registerSocketAuthMiddleware(io)

  io.on('connection', async (socket) => {
    const userId = socket.data.userId
    if (env.NODE_ENV === 'development') {
      console.log(`[Socket] userId=${userId} socket=${socket.id}`)
    } else {
      console.log(`[Socket] connected ${socket.id}`)
    }

    try {
      const roomIds = await joinConversationRoomsForSocket(socket, userId)
      if (env.NODE_ENV === 'development') {
        console.log(`[Socket] joined ${roomIds.length} conversation(s) user=${userId}`)
      }
    } catch (e) {
      console.error('[Socket] join rooms failed', e)
      socket.disconnect(true)
      return
    }

    registerChatSocketHandlers(io, socket)

    socket.on('disconnect', () => {
      if (env.NODE_ENV === 'development') {
        console.log(`[Socket] disconnect userId=${userId} socket=${socket.id}`)
      } else {
        console.log(`[Socket] disconnect ${socket.id}`)
      }
    })
  })

  return io
}

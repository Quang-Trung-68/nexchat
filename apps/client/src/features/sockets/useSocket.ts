import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useRealtimeMessagesStore } from '@/features/messages/store/realtimeMessages.store'

/**
 * Kết nối Socket.IO khi đã đăng nhập (cookie accessToken).
 * Path server: `/ws` — Vite proxy tới backend.
 */
export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      useRealtimeMessagesStore.getState().reset()
      setSocket((prev) => {
        prev?.close()
        return null
      })
      setConnected(false)
      setError(null)
      return
    }

    const s = io({
      path: '/ws',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    setSocket(s)

    s.on('connect', () => {
      setConnected(true)
      setError(null)
      if (import.meta.env.DEV) {
        console.log('[Socket client] connected', s.id)
      }
    })

    s.on('disconnect', () => {
      setConnected(false)
      if (import.meta.env.DEV) {
        console.log('[Socket client] disconnected')
      }
    })

    s.on('connect_error', (err) => {
      setError(err.message)
      if (import.meta.env.DEV) {
        console.warn('[Socket client] connect_error', err.message)
      }
    })

    return () => {
      s.close()
      setSocket(null)
      setConnected(false)
    }
  }, [isAuthenticated])

  return { socket, connected, error }
}

import jwt from 'jsonwebtoken'
import type { Server, Socket } from 'socket.io'
import { env } from '@/config/env'
import { authRepository } from '@/features/auth/auth.repository'
import type { JwtPayload } from '@/features/auth/auth.types'

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    try {
      out[key] = decodeURIComponent(val)
    } catch {
      out[key] = val
    }
  }
  return out
}

/**
 * Thứ tự: handshake.auth.token → Authorization Bearer → cookie accessToken
 */
export function extractAccessToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: string } | undefined
  if (auth?.token && typeof auth.token === 'string' && auth.token.length > 0) {
    return auth.token
  }

  const raw = socket.handshake.headers.authorization
  if (raw?.startsWith('Bearer ')) {
    const t = raw.slice(7).trim()
    if (t.length > 0) return t
  }

  const cookies = parseCookieHeader(socket.handshake.headers.cookie)
  const fromCookie = cookies.accessToken
  if (fromCookie && fromCookie.length > 0) return fromCookie

  return null
}

export function registerSocketAuthMiddleware(io: Server) {
  io.use(async (socket, next) => {
    const token = extractAccessToken(socket)
    if (!token) {
      return next(new Error('UNAUTHORIZED'))
    }
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload
    } catch {
      return next(new Error('UNAUTHORIZED'))
    }
    try {
      const user = await authRepository.findUserById(payload.sub)
      if (!user || user.deletedAt) {
        return next(new Error('UNAUTHORIZED'))
      }
      if (!user.emailVerifiedAt) {
        return next(new Error('EMAIL_NOT_VERIFIED'))
      }
      socket.data.userId = payload.sub
      next()
    } catch (err) {
      next(err as Error)
    }
  })
}

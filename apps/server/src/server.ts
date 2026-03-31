// Import env FIRST — dotenv.config() must run before any other imports
import './config/env'

import { initRedis } from './config/redis'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { env } from './config/env'
import { initPassport } from './config/passport'
import authRoutes from './modules/auth/auth.routes'
import roomsRoutes from './features/rooms/rooms.routes'
import messagesRoutes from './features/messages/messages.routes'
import searchRoutes from './features/search/search.routes'
import messageAttachmentsRoutes from './features/messages/messageAttachments.routes'
import messageReactionsRoutes from './features/messages/messageReactions.routes'
import configRoutes from './features/config/config.routes'
import usersRoutes from './features/users/users.routes'
import friendsRoutes from './features/friends/friends.routes'
import pushRoutes from './features/push/push.routes'
import { globalErrorHandler } from './middlewares/globalErrorHandler'
import { initSocketServer } from './features/sockets/socketServer'

const app = express()
const httpServer = http.createServer(app)

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json())

initPassport()
app.use(passport.initialize())

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomsRoutes)
app.use('/api/rooms', messagesRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/messages', messageAttachmentsRoutes)
app.use('/api/messages', messageReactionsRoutes)
app.use('/api/config', configRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/friends', friendsRoutes)
app.use('/api/push', pushRoutes)

// ─── Global error handler (must be LAST middleware) ───────────────────────────
app.use(globalErrorHandler)

// ─── Start server ─────────────────────────────────────────────────────────────
void (async () => {
  try {
    const mode = await initRedis()
    if (mode === 'redis') {
      console.log('[Server] Redis connected')
    }
  } catch (e) {
    console.error('[Server] Redis bắt buộc (production) — kiểm tra REDIS_URL và Redis.', e)
    process.exit(1)
  }

  initSocketServer(httpServer)

  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`)
    console.log(`[Server] Environment: ${env.NODE_ENV}`)
  })
})()

export { app, httpServer }

// Import env FIRST — dotenv.config() must run before any other imports
import './config/env'

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

// ─── Global error handler (must be LAST middleware) ───────────────────────────
app.use(globalErrorHandler)

// ─── Socket.IO ────────────────────────────────────────────────────────────────
initSocketServer(httpServer)

// ─── Start server ─────────────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`[Server] Running on http://localhost:${env.PORT}`)
  console.log(`[Server] Environment: ${env.NODE_ENV}`)
})

export { app, httpServer }

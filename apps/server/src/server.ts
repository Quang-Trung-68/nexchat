// Import env FIRST — dotenv.config() must run before any other imports
import './config/env'

import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { globalErrorHandler } from './middlewares/globalErrorHandler'
import { initSocketServer } from './sockets/socketServer'

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// TODO: Mount feature routers here in subsequent steps
// app.use('/api/auth', authRoutes)
// app.use('/api/rooms', roomRoutes)
// app.use('/api/messages', messageRoutes)

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

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from '../messages/messages.controller'
import { validateQuery, searchMessagesQuerySchema } from '../messages/messages.validation'

const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()
router.use(authenticate)
router.use(requireEmailVerified)
router.use(searchLimiter)
router.get('/messages', validateQuery(searchMessagesQuerySchema), controller.searchMessagesGlobal)

export default router

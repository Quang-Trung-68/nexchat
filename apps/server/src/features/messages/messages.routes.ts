import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from './messages.controller'
import {
  validateBody,
  validateQuery,
  createMessageSchema,
  listMessagesQuerySchema,
  searchMessagesQuerySchema,
} from './messages.validation'

const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

router.use(authenticate)
router.use(requireEmailVerified)

router.get(
  '/:id/messages/search',
  searchLimiter,
  validateQuery(searchMessagesQuerySchema),
  controller.searchMessagesInRoom
)
router.get('/:id/messages', validateQuery(listMessagesQuerySchema), controller.listMessages)
router.post(
  '/:id/messages',
  validateBody(createMessageSchema),
  controller.createMessage
)

export default router

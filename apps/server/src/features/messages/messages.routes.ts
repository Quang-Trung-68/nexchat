import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './messages.controller'
import {
  validateBody,
  validateQuery,
  createMessageSchema,
  listMessagesQuerySchema,
} from './messages.validation'

const router = Router()

router.use(authenticate)

router.get('/:id/messages', validateQuery(listMessagesQuerySchema), controller.listMessages)
router.post(
  '/:id/messages',
  validateBody(createMessageSchema),
  controller.createMessage
)

export default router

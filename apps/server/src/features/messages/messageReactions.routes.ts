import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { validateBody, setReactionBodySchema } from './messages.validation'
import * as controller from './messageReactions.controller'

const router = Router()

router.use(authenticate)

router.post('/:messageId/reactions', validateBody(setReactionBodySchema), controller.setReaction)

export default router

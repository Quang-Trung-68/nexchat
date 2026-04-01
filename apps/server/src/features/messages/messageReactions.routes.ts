import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import { validateBody, setReactionBodySchema } from './messages.validation'
import * as controller from './messageReactions.controller'

const router = Router()

router.use(authenticate)
router.use(requireEmailVerified)

router.post('/:messageId/reactions', validateBody(setReactionBodySchema), controller.setReaction)

export default router

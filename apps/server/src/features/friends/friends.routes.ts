import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import { validate } from '@/features/auth/auth.validation'
import * as controller from './friends.controller'
import { friendRequestSchema } from './friends.validation'

const router = Router()

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authenticate)
router.use(requireEmailVerified)
router.get('/', controller.listAccepted)
router.get('/incoming', controller.listIncoming)
router.get('/outgoing', controller.listOutgoing)
router.get('/pending', controller.listPending)
router.get('/relationship/:otherUserId', controller.getRelationship)
router.post('/request', writeLimiter, validate(friendRequestSchema), controller.sendRequest)
router.post('/accept/:friendshipId', writeLimiter, controller.accept)
router.delete('/:friendshipId', writeLimiter, controller.remove)

export default router

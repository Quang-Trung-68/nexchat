import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { validateQuery } from '@/features/messages/messages.validation'
import * as controller from './users.controller'
import { userLookupQuerySchema } from './users.validation'

const router = Router()

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authenticate)
router.get('/lookup', lookupLimiter, validateQuery(userLookupQuerySchema), controller.lookupUser)
router.get('/', controller.listUsers)

export default router

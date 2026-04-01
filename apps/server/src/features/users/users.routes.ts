import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import { getUploadConfig } from '@/config/upload.config'
import { validateBody, validateQuery } from '@/features/messages/messages.validation'
import * as controller from './users.controller'
import { updateProfileBodySchema, userLookupQuerySchema } from './users.validation'

const uploadCfg = getUploadConfig()
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadCfg.maxImageBytesPerFile },
}).single('avatar')

const router = Router()

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authenticate)
router.use(requireEmailVerified)
router.post('/me/avatar', avatarUpload, controller.uploadMyAvatar)
router.patch('/me', validateBody(updateProfileBodySchema), controller.updateMe)
router.get('/lookup', lookupLimiter, validateQuery(userLookupQuerySchema), controller.lookupUser)
router.get('/', controller.listUsers)

export default router

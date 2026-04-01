import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from './config.controller'

const router = Router()

router.get('/upload', authenticate, requireEmailVerified, controller.getUploadConfigPublic)

export default router

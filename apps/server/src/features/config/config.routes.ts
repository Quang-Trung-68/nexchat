import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './config.controller'

const router = Router()

router.get('/upload', authenticate, controller.getUploadConfigPublic)

export default router

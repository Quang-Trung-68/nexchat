import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './users.controller'

const router = Router()

router.use(authenticate)
router.get('/', controller.listUsers)

export default router

import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from './notifications.controller'

const router = Router()

router.use(authenticate)
router.use(requireEmailVerified)
router.get('/unread-count', controller.unreadCount)
router.get('/', controller.list)
router.patch('/read-all', controller.markAllRead)
router.patch('/:id/read', controller.markRead)

export default router

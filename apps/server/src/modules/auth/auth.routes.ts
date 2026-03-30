import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './auth.controller'
import {
  validate,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation'

const router = Router()

router.post('/register', validate(registerSchema), controller.register)
router.post('/login', controller.login)
router.post('/logout', controller.logout)
router.post('/refresh', controller.refresh)
router.get('/me', authenticate, controller.getMe)

router.get('/google', controller.googleAuth)
router.get('/google/callback', controller.googleCallback)

router.get('/github', controller.githubAuth)
router.get('/github/callback', controller.githubCallback)

router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword)

export default router

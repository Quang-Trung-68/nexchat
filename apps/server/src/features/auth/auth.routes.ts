import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from './auth.controller'
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  setPasswordSchema,
} from './auth.validation'

const router = Router()

const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', validate(registerSchema), controller.register)
router.post('/login', validate(loginSchema), controller.login)
router.post('/logout', controller.logout)
router.post('/refresh', controller.refresh)
router.get('/me', authenticate, controller.getMe)

router.post(
  '/verify-email',
  authenticate,
  validate(verifyEmailSchema),
  controller.verifyEmail
)
router.post(
  '/resend-verification',
  authenticate,
  authActionLimiter,
  controller.resendVerification
)

router.post(
  '/change-password',
  authenticate,
  requireEmailVerified,
  validate(changePasswordSchema),
  controller.changePassword
)
router.post(
  '/set-password',
  authenticate,
  requireEmailVerified,
  validate(setPasswordSchema),
  controller.setPassword
)

router.get('/google', controller.googleAuth)
router.get('/google/callback', controller.googleCallback)

router.get('/github', controller.githubAuth)
router.get('/github/callback', controller.githubCallback)

router.post(
  '/forgot-password',
  authActionLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword
)
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword)

export default router

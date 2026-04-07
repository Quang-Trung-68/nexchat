import type { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import type { User } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { AppError } from '@/shared/errors/AppError'
import { authService } from './auth.service'
import type { TokenPair } from './auth.types'

function cookieBaseOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: string
  domain?: string
} {
  const domain = env.COOKIE_DOMAIN.trim()
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  }
}

function setAuthCookies(res: Response, tokens: TokenPair) {
  const base = cookieBaseOptions()
  res.cookie('accessToken', tokens.accessToken, {
    ...base,
    maxAge: 15 * 60 * 1000,
  })
  res.cookie('refreshToken', tokens.refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function clearAuthCookies(res: Response) {
  const base = cookieBaseOptions()
  res.clearCookie('accessToken', base)
  res.clearCookie('refreshToken', base)
}

function toPublicUser(user: User | Express.User) {
  const { password: _omitPassword, ...rest } = user as User
  void _omitPassword
  return rest
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.register(req.body)
    const tokens = await authService.generateTokenPair(user.id, user.email)
    setAuthCookies(res, tokens)
    res.status(201).json({
      success: true,
      data: { user: { ...user, hasPassword: true } },
    })
  } catch (e) {
    next(e)
  }
}

export function login(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'local',
    { session: false },
    async (err: unknown, user: false | User | undefined) => {
      if (err) return next(err)
      if (!user) {
        return next(
          new AppError(
            'Email/username/số điện thoại hoặc mật khẩu không đúng',
            401,
            'INVALID_CREDENTIALS'
          )
        )
      }
      try {
        const tokens = await authService.generateTokenPair(user.id, user.email)
        setAuthCookies(res, tokens)
        const u = user as User
        res.json({
          success: true,
          data: {
            user: { ...toPublicUser(user), hasPassword: !!u.password },
          },
        })
      } catch (e) {
        next(e)
      }
    }
  )(req, res, next)
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.refreshToken as string | undefined
    if (raw) await authService.logout(raw)
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.refreshToken as string | undefined
    if (!raw) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
    }
    const tokens = await authService.refreshTokens(raw)
    setAuthCookies(res, tokens)
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { password: true },
    })
    res.json({
      success: true,
      data: {
        user: { ...req.user, hasPassword: !!row?.password },
      },
    })
  } catch (e) {
    next(e)
  }
}

export function googleAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', { session: false })(req, res, next)
}

export function googleCallback(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'google',
    { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` },
    (err: unknown, user: Express.User | false) => {
      if (err) return next(err)
      if (!user) return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`)
      const tokens = req.oauthTokens
      if (!tokens) {
        return next(new AppError('OAuth flow failed', 500, 'INTERNAL_ERROR'))
      }
      setAuthCookies(res, tokens)
      res.redirect(env.CLIENT_URL)
    }
  )(req, res, next)
}

export function githubAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('github', { session: false })(req, res, next)
}

export function githubCallback(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'github',
    { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` },
    (err: unknown, user: Express.User | false) => {
      if (err) return next(err)
      if (!user) return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`)
      const tokens = req.oauthTokens
      if (!tokens) {
        return next(new AppError('OAuth flow failed', 500, 'INTERNAL_ERROR'))
      }
      setAuthCookies(res, tokens)
      res.redirect(env.CLIENT_URL)
    }
  )(req, res, next)
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email)
    res.json({
      success: true,
      message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác thực',
    })
  } catch (e) {
    next(e)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body)
    clearAuthCookies(res)
    res.json({ success: true, message: 'Mật khẩu đã được cập nhật' })
  } catch (e) {
    next(e)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.verifyEmail(req.user!.id, req.body.code)
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        emailVerifiedAt: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    })
    const pw = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { password: true },
    })
    res.json({
      success: true,
      data: {
        user: user ? { ...user, hasPassword: !!pw?.password } : undefined,
      },
    })
  } catch (e) {
    next(e)
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resendVerificationEmail(req.user!.id)
    res.json({ success: true, message: 'Đã gửi lại mã xác thực' })
  } catch (e) {
    next(e)
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.changePassword(req.user!.id, req.body)
    res.json({ success: true, message: 'Mật khẩu đã được cập nhật' })
  } catch (e) {
    next(e)
  }
}

export async function setPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.setPassword(req.user!.id, req.body)
    res.json({ success: true, message: 'Mật khẩu đã được đặt' })
  } catch (e) {
    next(e)
  }
}

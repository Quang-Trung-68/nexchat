import passport from 'passport'
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@/shared/errors/AppError'

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: false | Express.User | undefined) => {
      if (err) return next(err)
      if (!user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
      req.user = user
      next()
    }
  )(req, res, next)
}

declare global {
  namespace Express {
    interface User {
      id: string
      email: string
      username: string
      displayName: string
      avatarUrl: string | null
      bio: string | null
      isOnline: boolean
      lastSeenAt: Date
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }
  }
}

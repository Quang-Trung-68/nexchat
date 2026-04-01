import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@/shared/errors/AppError'

/** Gọi sau `authenticate`. Chặn user chưa xác thực email. */
export function requireEmailVerified(req: Request, _res: Response, next: NextFunction) {
  const u = req.user
  if (!u?.emailVerifiedAt) {
    return next(new AppError('Cần xác thực email', 403, 'EMAIL_NOT_VERIFIED'))
  }
  next()
}

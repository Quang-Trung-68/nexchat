import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/shared/errors/AppError'

// Placeholder — full JWT/cookie auth logic will be implemented in Step 3
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // TODO: Verify JWT from HttpOnly cookie, attach user to req
  // Example implementation in Step 3:
  // const token = req.cookies.accessToken
  // if (!token) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
  // const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload
  // req.user = decoded
  // next()
  void req // suppress unused variable warning
  next(new AppError('Authentication not implemented yet', 501, 'NOT_IMPLEMENTED'))
}

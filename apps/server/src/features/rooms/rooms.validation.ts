import type { Request, Response, NextFunction } from 'express'
import { z, type ZodSchema } from 'zod'
import { AppError } from '@/shared/errors/AppError'

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  participantIds: z.array(z.string().cuid()).min(1),
})

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return next(
        new AppError(result.error.issues[0].message, 400, 'VALIDATION_ERROR')
      )
    }
    req.body = result.data
    next()
  }

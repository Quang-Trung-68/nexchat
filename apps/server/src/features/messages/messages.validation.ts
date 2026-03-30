import type { Request, Response, NextFunction } from 'express'
import { z, type ZodSchema } from 'zod'
import { AppError } from '@/shared/errors/AppError'

const apiFileType = z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'])

export const listMessagesQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
})

export const createMessageSchema = z
  .object({
    content: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileType: apiFileType.optional(),
    parentMessageId: z.string().cuid().optional(),
  })
  .refine(
    (data) => {
      const hasContent = data.content !== undefined && data.content.trim().length > 0
      const hasFile = data.fileUrl !== undefined && data.fileUrl.length > 0
      return hasContent || hasFile
    },
    { message: 'Cần ít nhất content hoặc fileUrl', path: ['content'] }
  )

/** Socket `chat:send` — cùng rule body với REST + conversationId. */
export const chatSendPayloadSchema = z
  .object({
    conversationId: z.string().cuid(),
    content: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileType: apiFileType.optional(),
    parentMessageId: z.string().cuid().optional(),
  })
  .refine(
    (data) => {
      const hasContent = data.content !== undefined && data.content.trim().length > 0
      const hasFile = data.fileUrl !== undefined && data.fileUrl.length > 0
      return hasContent || hasFile
    },
    { message: 'Cần ít nhất content hoặc fileUrl', path: ['content'] }
  )

export const validateBody =
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

export const validateQuery =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return next(
        new AppError(result.error.issues[0].message, 400, 'VALIDATION_ERROR')
      )
    }
    req.query = result.data as Request['query']
    next()
  }

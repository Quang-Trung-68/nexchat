import type { Request, Response, NextFunction } from 'express'
import {
  ALLOWED_REACTION_EMOJIS_NORMALIZED,
  normalizeReactionEmoji,
} from '@chat-app/shared-constants'
import { z, type ZodSchema } from 'zod'
import { getUploadConfig } from '@/config/upload.config'
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
    plannedImageCount: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const hasContent = data.content !== undefined && data.content.trim().length > 0
    const hasFile = data.fileUrl !== undefined && data.fileUrl.length > 0
    const planned = data.plannedImageCount ?? 0
    if (!hasContent && !hasFile && planned < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cần ít nhất nội dung, file hoặc plannedImageCount > 0',
        path: ['content'],
      })
    }
    const max = getUploadConfig().maxImagesPerMessage
    if (planned > max) {
      ctx.addIssue({
        code: 'custom',
        message: `Tối đa ${max} ảnh mỗi tin`,
        path: ['plannedImageCount'],
      })
    }
  })

/** Socket `chat:send` — cùng rule body với REST + conversationId. */
export const chatSendPayloadSchema = z
  .object({
    conversationId: z.string().cuid(),
    content: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileType: apiFileType.optional(),
    parentMessageId: z.string().cuid().optional(),
    plannedImageCount: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const hasContent = data.content !== undefined && data.content.trim().length > 0
    const hasFile = data.fileUrl !== undefined && data.fileUrl.length > 0
    const planned = data.plannedImageCount ?? 0
    if (!hasContent && !hasFile && planned < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cần ít nhất nội dung, file hoặc plannedImageCount > 0',
        path: ['content'],
      })
    }
    const max = getUploadConfig().maxImagesPerMessage
    if (planned > max) {
      ctx.addIssue({
        code: 'custom',
        message: `Tối đa ${max} ảnh mỗi tin`,
        path: ['plannedImageCount'],
      })
    }
  })

/** Socket `typing:start` / `typing:stop` — chỉ cần room. */
export const typingConversationPayloadSchema = z.object({
  conversationId: z.string().cuid(),
})

export const setReactionBodySchema = z.object({
  emoji: z
    .string()
    .min(1)
    .max(32)
    .transform((s) => normalizeReactionEmoji(s))
    .refine((s) => ALLOWED_REACTION_EMOJIS_NORMALIZED.includes(s), 'Emoji không hợp lệ'),
})

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

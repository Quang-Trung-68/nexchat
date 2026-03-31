import type { Request, Response, NextFunction } from 'express'
import { z, type ZodSchema } from 'zod'
import { AppError } from '@/shared/errors/AppError'

const optionalPhoneSchema = z.preprocess(
  (val: unknown) => {
    if (val === undefined || val === null || val === '') return undefined
    return val
  },
  z.string().regex(/^[0-9]{8,15}$/, 'Số điện thoại chỉ gồm 8–15 chữ số').optional()
)

export const registerSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/, 'Username chỉ được chứa chữ thường, số, gạch dưới'),
    displayName: z.string().min(1).max(50),
    phone: optionalPhoneSchema,
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password phải có ít nhất 1 chữ hoa và 1 số'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password phải có ít nhất 1 chữ hoa và 1 số'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
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

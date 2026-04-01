import { z } from 'zod'
import { USER_LOOKUP } from '@chat-app/shared-constants'

export const userLookupQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(USER_LOOKUP.MIN_QUERY_LENGTH, `Nhập ít nhất ${USER_LOOKUP.MIN_QUERY_LENGTH} ký tự`)
    .max(USER_LOOKUP.MAX_QUERY_LENGTH),
})

const optionalPhone = z
  .union([z.string().regex(/^[0-9]{8,15}$/, 'Số điện thoại chỉ gồm 8–15 chữ số'), z.literal('')])
  .optional()

/** PATCH /users/me — ít nhất một trường. */
export const updateProfileBodySchema = z
  .object({
    displayName: z.string().min(1).max(50).optional(),
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/, 'Username chỉ được chứa chữ thường, số, gạch dưới')
      .optional(),
    bio: z.union([z.string().max(500), z.literal('')]).optional(),
    phone: optionalPhone,
    avatarUrl: z.union([z.string().url('URL không hợp lệ'), z.literal('')]).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Gửi ít nhất một trường cần cập nhật',
    path: ['displayName'],
  })

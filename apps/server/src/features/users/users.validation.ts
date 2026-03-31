import { z } from 'zod'
import { USER_LOOKUP } from '@chat-app/shared-constants'

export const userLookupQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(USER_LOOKUP.MIN_QUERY_LENGTH, `Nhập ít nhất ${USER_LOOKUP.MIN_QUERY_LENGTH} ký tự`)
    .max(USER_LOOKUP.MAX_QUERY_LENGTH),
})

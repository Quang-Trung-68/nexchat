import { z } from 'zod'

export const friendRequestSchema = z.object({
  addresseeId: z.string().cuid(),
})

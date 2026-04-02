import { z } from 'zod'

const qParam = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v[0] ?? ''
    return v ?? ''
  },
  z.string()
)

export const listPostsQuerySchema = z.object({
  scope: z.enum(['timeline', 'mine']),
  cursor: z.string().cuid().optional(),
  /** Chỉ timeline: lấy bài mới hơn bài này (để prepend). */
  newerThan: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  q: qParam.optional().default(''),
})

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>

export const updatePostBodySchema = z.object({
  content: z.string().max(5000),
})

export const listCommentsQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const commentBodySchema = z.object({
  content: z.string().max(2000),
})

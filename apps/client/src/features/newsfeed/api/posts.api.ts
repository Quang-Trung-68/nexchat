import { api } from '@/services/api'

export type PostAuthorDto = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  bio: string | null
}

export type PostImageDto = {
  id: string
  url: string
  sortOrder: number
}

export type PostItemDto = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: PostAuthorDto
  images: PostImageDto[]
  likeCount: number
  commentCount: number
  likedByMe: boolean
}

export type PostDetailDto = PostItemDto & {
  hiddenCommentCount: number
}

export type PostCommentDto = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: PostAuthorDto
}

export type CommentsPageDto = {
  comments: PostCommentDto[]
  nextCursor: string | null
  hasMore: boolean
  hiddenCommentCount: number
}

export type PostsPageDto = {
  posts: PostItemDto[]
  nextCursor: string | null
  hasMore: boolean
}

export type LikersResponseDto = {
  items: { user: PostAuthorDto; likedAt: string }[]
  restricted: boolean
}

export async function fetchPostsPage(
  scope: 'timeline' | 'mine',
  opts: { cursor?: string; limit?: number; q?: string }
): Promise<PostsPageDto> {
  const params = new URLSearchParams()
  params.set('scope', scope)
  if (opts.cursor) params.set('cursor', opts.cursor)
  params.set('limit', String(opts.limit ?? 20))
  const q = opts.q?.trim()
  if (q) params.set('q', q)
  const { data } = await api.get<{ success: boolean; data: PostsPageDto }>(`/posts?${params}`)
  return data.data
}

export async function fetchPostById(postId: string): Promise<PostDetailDto> {
  const { data } = await api.get<{ success: boolean; data: PostDetailDto }>(`/posts/${postId}`)
  return data.data
}

export async function fetchCommentsPage(
  postId: string,
  opts: { cursor?: string; limit?: number }
): Promise<CommentsPageDto> {
  const params = new URLSearchParams()
  if (opts.cursor) params.set('cursor', opts.cursor)
  params.set('limit', String(opts.limit ?? 20))
  const { data } = await api.get<{ success: boolean; data: CommentsPageDto }>(
    `/posts/${postId}/comments?${params}`
  )
  return data.data
}

export async function toggleLike(postId: string): Promise<{ likeCount: number; likedByMe: boolean }> {
  const { data } = await api.post<{
    success: boolean
    data: { likeCount: number; likedByMe: boolean }
  }>(`/posts/${postId}/like`, {})
  return data.data
}

export async function fetchLikers(postId: string): Promise<LikersResponseDto> {
  const { data } = await api.get<{ success: boolean; data: LikersResponseDto }>(
    `/posts/${postId}/likes`
  )
  return data.data
}

export async function createPost(content: string, files: File[]): Promise<PostItemDto> {
  const fd = new FormData()
  fd.append('content', content)
  for (const f of files) {
    fd.append('images', f)
  }
  const { data } = await api.post<{ success: boolean; data: PostItemDto }>('/posts', fd)
  return data.data
}

export async function updatePost(postId: string, content: string): Promise<PostItemDto> {
  const { data } = await api.patch<{ success: boolean; data: PostItemDto }>(`/posts/${postId}`, {
    content,
  })
  return data.data
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`)
}

export async function createComment(postId: string, content: string): Promise<PostCommentDto> {
  const { data } = await api.post<{ success: boolean; data: PostCommentDto }>(
    `/posts/${postId}/comments`,
    { content }
  )
  return data.data
}

export async function updateComment(
  postId: string,
  commentId: string,
  content: string
): Promise<PostCommentDto> {
  const { data } = await api.patch<{ success: boolean; data: PostCommentDto }>(
    `/posts/${postId}/comments/${commentId}`,
    { content }
  )
  return data.data
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/posts/${postId}/comments/${commentId}`)
}

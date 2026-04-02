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

export type PostsPageDto = {
  posts: PostItemDto[]
  nextCursor: string | null
  hasMore: boolean
}

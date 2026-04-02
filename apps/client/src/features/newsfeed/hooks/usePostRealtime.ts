import { useEffect } from 'react'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { PostDetailDto, PostItemDto, PostsPageDto } from '@/features/newsfeed/api/posts.api'
import { postKeys } from '@/features/newsfeed/queries/newsfeedQueryKeys'

function patchPostInInfiniteLists(
  queryClient: QueryClient,
  postId: string,
  patch: (p: PostItemDto) => PostItemDto
) {
  queryClient.setQueriesData<InfiniteData<PostsPageDto>>(
    { queryKey: ['posts', 'infinite'] },
    (old) => {
      if (!old?.pages?.length) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) => (p.id === postId ? patch(p) : p)),
        })),
      }
    }
  )
}

type LikePayload = {
  postId: string
  likeCount: number
  likedByMeUserId: string
  likedByMe: boolean
}

type CommentPayload =
  | {
      postId: string
      action: 'create' | 'delete'
      commentCount: number
    }
  | {
      postId: string
      action: 'update'
    }

export function usePostRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()
  const userId = useAuth().user?.id

  useEffect(() => {
    if (!socket || !connected) return

    const onLike = (raw: unknown) => {
      const p = raw as LikePayload
      if (!p?.postId) return
      patchPostInInfiniteLists(queryClient, p.postId, (row) => ({
        ...row,
        likeCount: p.likeCount,
        likedByMe:
          userId && p.likedByMeUserId === userId ? p.likedByMe : row.likedByMe,
      }))
      queryClient.setQueryData<PostDetailDto>(
        postKeys.detail(p.postId),
        (old) =>
          old
            ? {
                ...old,
                likeCount: p.likeCount,
                likedByMe:
                  userId && p.likedByMeUserId === userId ? p.likedByMe : old.likedByMe,
              }
            : old
      )
    }

    const onComment = (raw: unknown) => {
      const p = raw as CommentPayload
      if (!p?.postId) return
      if ('commentCount' in p && typeof p.commentCount === 'number') {
        patchPostInInfiniteLists(queryClient, p.postId, (row) => ({
          ...row,
          commentCount: p.commentCount,
        }))
        queryClient.setQueryData<PostDetailDto>(
          postKeys.detail(p.postId),
          (old) => (old ? { ...old, commentCount: p.commentCount } : old)
        )
      }
      void queryClient.invalidateQueries({ queryKey: postKeys.comments(p.postId) })
    }

    socket.on(SOCKET_EVENTS.POST_LIKE_UPDATED, onLike)
    socket.on(SOCKET_EVENTS.POST_COMMENT_UPDATED, onComment)

    return () => {
      socket.off(SOCKET_EVENTS.POST_LIKE_UPDATED, onLike)
      socket.off(SOCKET_EVENTS.POST_COMMENT_UPDATED, onComment)
    }
  }, [socket, connected, queryClient, userId])
}

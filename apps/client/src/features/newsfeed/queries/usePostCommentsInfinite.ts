import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchCommentsPage } from '@/features/newsfeed/api/posts.api'
import { postKeys } from '@/features/newsfeed/queries/newsfeedQueryKeys'

const PAGE = 20

export function usePostCommentsInfinite(postId: string | undefined, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: postKeys.comments(postId ?? '__none__'),
    enabled: Boolean(postId) && enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchCommentsPage(postId!, { cursor: pageParam, limit: PAGE }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

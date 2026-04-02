import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchPostsPage } from '../api/posts.api'
import { postsInfiniteKeys } from './newsfeedQueryKeys'

const PAGE_SIZE = 20

export function usePostsInfinite(scope: 'timeline' | 'mine', q: string) {
  const needle = q.trim()
  return useInfiniteQuery({
    queryKey: postsInfiniteKeys.list(scope, needle),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      fetchPostsPage(scope, { cursor: pageParam, limit: PAGE_SIZE, q: needle || undefined }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

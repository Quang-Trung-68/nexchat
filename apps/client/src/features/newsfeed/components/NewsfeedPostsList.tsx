import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { usePostsInfinite } from '../queries/usePostsInfinite'
import { PostCard } from './PostCard'

type NewsfeedPostsListProps = {
  scope: 'timeline' | 'mine'
  /** Giá trị đã debounce (ms) — dùng làm filter API. */
  debouncedSearch: string
}

export function NewsfeedPostsList({ scope, debouncedSearch }: NewsfeedPostsListProps) {
  const q = usePostsInfinite(scope, debouncedSearch)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const posts = q.data?.pages.flatMap((p) => p.posts) ?? []

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) {
          void q.fetchNextPage()
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage, posts.length])

  if (q.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (q.isError) {
    return (
      <p className="py-8 text-center text-sm text-destructive">Không tải được bài viết. Thử lại sau.</p>
    )
  }

  if (posts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {scope === 'timeline' ? 'Chưa có bài viết từ bạn bè.' : 'Bạn chưa có bài nhật ký nào.'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
      {q.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  )
}

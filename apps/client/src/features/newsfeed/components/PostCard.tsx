import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Loader2, MessageCircle, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react'
import type { InfiniteData } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { PostAuthorHoverCard } from './PostAuthorHoverCard'
import { MessageImageGrid } from '@/shared/components/MessageImageGrid'
import {
  createComment,
  deletePost,
  fetchLikers,
  toggleLike,
  updatePost,
  type PostDetailDto,
  type PostItemDto,
  type PostsPageDto,
} from '@/features/newsfeed/api/posts.api'
import { postKeys } from '@/features/newsfeed/queries/newsfeedQueryKeys'

function AnimatedCount({ value }: { value: number }) {
  const prev = useRef(value)
  const [bump, setBump] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (value !== prev.current) {
      setBump(value > prev.current ? 'up' : 'down')
      prev.current = value
      const t = window.setTimeout(() => setBump(null), 320)
      return () => window.clearTimeout(t)
    }
  }, [value])
  return (
    <span
      className={cn(
        'tabular-nums inline-block transition-transform duration-300 ease-out',
        bump === 'up' && '-translate-y-1',
        bump === 'down' && 'translate-y-1'
      )}
    >
      {value}
    </span>
  )
}

type PostCardProps = {
  post: PostItemDto
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const isMine = user?.id === post.author.id
  const isAuthorPost = user?.id === post.author.id
  const [editOpen, setEditOpen] = useState(false)
  const [editText, setEditText] = useState(post.content)
  const [likersOpen, setLikersOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')

  const likersQ = useQuery({
    queryKey: postKeys.likers(post.id),
    queryFn: () => fetchLikers(post.id),
    enabled: Boolean(likersOpen && isAuthorPost),
  })

  const del = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const patch = useMutation({
    mutationFn: (content: string) => updatePost(post.id, content),
    onSuccess: () => {
      setEditOpen(false)
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const commentMut = useMutation({
    mutationFn: (text: string) => createComment(post.id, text),
    onSuccess: () => {
      setCommentDraft('')
      setCommentOpen(false)
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
      void qc.invalidateQueries({ queryKey: postKeys.detail(post.id) })
      void qc.invalidateQueries({ queryKey: postKeys.comments(post.id) })
    },
  })

  const likeMut = useMutation({
    mutationFn: () => toggleLike(post.id),
    onSuccess: (data) => {
      void qc.setQueriesData<InfiniteData<PostsPageDto>>(
        { queryKey: ['posts', 'infinite'] },
        (old) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p.id === post.id ? { ...p, likeCount: data.likeCount, likedByMe: data.likedByMe } : p
              ),
            })),
          }
        }
      )
      void qc.setQueryData<PostDetailDto | undefined>(postKeys.detail(post.id), (old) =>
        old ? { ...old, likeCount: data.likeCount, likedByMe: data.likedByMe } : old
      )
    },
  })

  const initial = post.author.displayName.slice(0, 1).toUpperCase()
  const timeLabel = new Date(post.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sortedImages = post.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const imageUrls = sortedImages.map((i) => i.url)

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0 border border-border">
          {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <PostAuthorHoverCard author={post.author}>
                <button
                  type="button"
                  className="block w-full max-w-full text-left font-semibold text-foreground outline-none transition-colors hover:text-[#0068ff] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {post.author.displayName}
                </button>
              </PostAuthorHoverCard>
              <div className="text-xs text-muted-foreground">
                @{post.author.username} · {timeLabel}
              </div>
            </div>
            {isMine ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Tuỳ chọn bài viết</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditText(post.content)
                      setEditOpen(true)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (window.confirm('Xóa bài viết này?')) del.mutate()
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {post.content ? (
            <Link
              to={`/newsfeed/${post.id}`}
              className="mt-2 block rounded-md text-sm text-foreground no-underline outline-none ring-offset-2 hover:bg-transparent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="whitespace-pre-wrap">{post.content}</p>
            </Link>
          ) : null}
          {sortedImages.length > 0 ? (
            <div className="mt-3">
              <MessageImageGrid
                urls={imageUrls}
                onPhotoClick={() => navigate(`/newsfeed/${post.id}`)}
              />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-sm">
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted',
                post.likedByMe && 'text-[#0068ff]'
              )}
              onClick={() => likeMut.mutate()}
              disabled={likeMut.isPending}
              aria-pressed={post.likedByMe}
            >
              {likeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={cn('h-4 w-4', post.likedByMe && 'fill-current')} aria-hidden />
              )}
              <span>Thích</span>
            </button>

            {isAuthorPost ? (
              <DropdownMenu open={likersOpen} onOpenChange={setLikersOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <AnimatedCount value={post.likeCount} /> lượt thích
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto" align="start">
                  {likersQ.isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : likersQ.data?.restricted ? null : (
                    likersQ.data?.items.map((row) => (
                      <div key={row.user.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <Avatar className="h-7 w-7">
                          {row.user.avatarUrl ? <AvatarImage src={row.user.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-[10px]">
                            {row.user.displayName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.user.displayName}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            @{row.user.username}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-muted-foreground">
                <AnimatedCount value={post.likeCount} /> lượt thích
              </span>
            )}

            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                commentOpen && 'bg-muted text-foreground'
              )}
              onClick={() => setCommentOpen((o) => !o)}
              aria-expanded={commentOpen}
              aria-label={commentOpen ? 'Đóng ô bình luận' : 'Mở ô bình luận'}
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              <AnimatedCount value={post.commentCount} /> bình luận
            </button>
          </div>

          {commentOpen ? (
            <div className="mt-3 rounded-lg border border-border/80 bg-muted/30 p-3 shadow-sm">
              <label htmlFor={`comment-${post.id}`} className="sr-only">
                Nội dung bình luận
              </label>
              <textarea
                id={`comment-${post.id}`}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Viết bình luận…"
                rows={3}
                maxLength={2000}
                className={cn(
                  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
                  'resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCommentOpen(false)
                    setCommentDraft('')
                  }}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={commentMut.isPending || !commentDraft.trim()}
                  onClick={() => commentMut.mutate(commentDraft.trim())}
                >
                  {commentMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                  <span className="ml-1.5">Bình luận</span>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
          </DialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={5}
            maxLength={5000}
            className={cn(
              'flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
              'resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          />
          {patch.isError ? (
            <p className="text-sm text-destructive">Không lưu được. Thử lại.</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => patch.mutate(editText)}
              disabled={patch.isPending || (!editText.trim() && post.images.length === 0)}
            >
              {patch.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

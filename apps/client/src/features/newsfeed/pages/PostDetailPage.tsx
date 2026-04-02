import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'
import { MobileBottomNav, mobileNavBottomPaddingClassName } from '@/shared/components/MobileBottomNav'
import { ImagePreviewLightbox } from '@/shared/components/ImagePreviewLightbox'
import { MessageImageGrid } from '@/shared/components/MessageImageGrid'
import {
  createComment,
  deleteComment,
  fetchLikers,
  fetchPostById,
  toggleLike,
  updateComment,
  type PostCommentDto,
  type PostDetailDto,
} from '@/features/newsfeed/api/posts.api'
import { postKeys } from '@/features/newsfeed/queries/newsfeedQueryKeys'
import { usePostCommentsInfinite } from '@/features/newsfeed/queries/usePostCommentsInfinite'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const contactsPendingBadge = useContactsPendingBadge()
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  })
  const [commentDraft, setCommentDraft] = useState('')
  const [likersOpen, setLikersOpen] = useState(false)
  const [editComment, setEditComment] = useState<PostCommentDto | null>(null)
  const [editText, setEditText] = useState('')
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const postQ = useQuery({
    queryKey: postKeys.detail(postId ?? ''),
    queryFn: () => fetchPostById(postId!),
    enabled: Boolean(postId),
  })

  const commentsQ = usePostCommentsInfinite(postId, Boolean(postId && postQ.isSuccess))

  const likersQ = useQuery({
    queryKey: postKeys.likers(postId ?? ''),
    queryFn: () => fetchLikers(postId!),
    enabled: Boolean(postId && likersOpen && user?.id === postQ.data?.author.id),
  })

  const post = postQ.data
  const isAuthorPost = Boolean(user && post && user.id === post.author.id)

  const likeMut = useMutation({
    mutationFn: () => toggleLike(postId!),
    onSuccess: (data) => {
      if (!postId) return
      qc.setQueryData<PostDetailDto>(postKeys.detail(postId), (old) =>
        old ? { ...old, likeCount: data.likeCount, likedByMe: data.likedByMe } : old
      )
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const sendComment = useMutation({
    mutationFn: () => createComment(postId!, commentDraft.trim()),
    onSuccess: () => {
      setCommentDraft('')
      void qc.invalidateQueries({ queryKey: postKeys.comments(postId!) })
      void qc.invalidateQueries({ queryKey: postKeys.detail(postId!) })
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const patchComment = useMutation({
    mutationFn: () => updateComment(postId!, editComment!.id, editText),
    onSuccess: () => {
      setEditComment(null)
      void qc.invalidateQueries({ queryKey: postKeys.comments(postId!) })
    },
  })

  const removeComment = useMutation({
    mutationFn: (cid: string) => deleteComment(postId!, cid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: postKeys.comments(postId!) })
      void qc.invalidateQueries({ queryKey: postKeys.detail(postId!) })
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const pages = commentsQ.data?.pages ?? []
  const hiddenFromPage = pages[0]?.hiddenCommentCount ?? 0
  /** API trả theo thời gian giảm dần; hiển thị cũ → mới. */
  const commentsAsc = [...pages.flatMap((p) => p.comments)].reverse()

  useEffect(() => {
    const el = topSentinelRef.current
    const root = scrollRef.current
    if (!el || !root) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && commentsQ.hasNextPage && !commentsQ.isFetchingNextPage) {
          void commentsQ.fetchNextPage()
        }
      },
      { root, rootMargin: '120px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [commentsQ.hasNextPage, commentsQ.isFetchingNextPage, commentsQ.fetchNextPage, commentsAsc.length])

  const sortedImages = post?.images.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? []
  const imageUrls = sortedImages.map((i) => i.url)

  if (!postId) {
    return <p className="p-6 text-sm text-destructive">Thiếu mã bài viết.</p>
  }

  if (postQ.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (postQ.isError || !post) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Không tải được bài viết hoặc bạn không có quyền xem.</p>
        <Button type="button" variant="link" className="mt-2 px-0" onClick={() => navigate('/newsfeed')}>
          Về Nhật ký
        </Button>
      </div>
    )
  }

  const initial = post.author.displayName.slice(0, 1).toUpperCase()

  return (
    <div
      className={cn(
        'flex h-[100dvh] w-full overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] text-foreground',
        mobileNavBottomPaddingClassName()
      )}
    >
      <ChatNavRail
        className="hidden lg:flex"
        displayName={user?.displayName}
        username={user?.username}
        avatarUrl={user?.avatarUrl}
        onLogout={() => void logout()}
        contactsPendingBadge={contactsPendingBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">Chi tiết bài viết</h1>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-secondary-surface">
          <article className="mx-auto max-w-3xl border-b border-border/60 bg-card px-4 py-4 lg:px-8">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0 border border-border">
                {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{post.author.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  @{post.author.username} · {timeLabel(post.createdAt)}
                </div>
                {post.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
                ) : null}
                {sortedImages.length > 0 ? (
                  <div className="mt-3">
                    <MessageImageGrid
                      urls={imageUrls}
                      onPhotoClick={(i) => setLightbox({ open: true, index: i })}
                    />
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
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
                    <Heart
                      className={cn('h-4 w-4', post.likedByMe && 'fill-current')}
                      aria-hidden
                    />
                    <span>Thích</span>
                  </button>

                  {isAuthorPost ? (
                    <DropdownMenu open={likersOpen} onOpenChange={setLikersOpen}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {post.likeCount} lượt thích
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto" align="start">
                        {likersQ.isLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : likersQ.data?.restricted ? null : (
                          likersQ.data?.items.map((row) => (
                            <div
                              key={row.user.id}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm"
                            >
                              <Avatar className="h-7 w-7">
                                {row.user.avatarUrl ? (
                                  <AvatarImage src={row.user.avatarUrl} alt="" />
                                ) : null}
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
                    <span className="text-muted-foreground">{post.likeCount} lượt thích</span>
                  )}

                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {post.commentCount} bình luận
                  </span>
                </div>
              </div>
            </div>
          </article>

          <div className="mx-auto max-w-3xl px-4 py-3 lg:px-8">
            {hiddenFromPage > 0 ? (
              <p className="mb-3 text-center text-xs text-muted-foreground">
                {hiddenFromPage} bình luận không hiển thị vì không cùng nhóm bạn bè với người bình luận.
              </p>
            ) : null}

            <div ref={topSentinelRef} className="h-1 w-full" aria-hidden />
            {commentsQ.isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            <ul className="space-y-3">
              {commentsAsc.map((c) => {
                const mine = user?.id === c.author.id
                const canEdit = mine
                const canDelete = mine || isAuthorPost
                return (
                  <li
                    key={c.id}
                    className="flex gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {c.author.avatarUrl ? <AvatarImage src={c.author.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[10px]">
                        {c.author.displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">{c.author.displayName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {timeLabel(c.createdAt)}
                          </span>
                        </div>
                        {(canEdit || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditComment(c)
                                    setEditText(c.content)
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Sửa
                                </DropdownMenuItem>
                              ) : null}
                              {canDelete ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (window.confirm('Xóa bình luận này?')) removeComment.mutate(c.id)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{c.content}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            {commentsQ.isSuccess && commentsAsc.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có bình luận.</p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <form
            className="mx-auto flex max-w-3xl gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const t = commentDraft.trim()
              if (!t || sendComment.isPending) return
              sendComment.mutate()
            }}
          >
            <Input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Viết bình luận…"
              maxLength={2000}
              className="min-h-10 flex-1"
              aria-label="Nội dung bình luận"
            />
            <Button type="submit" size="icon" disabled={sendComment.isPending || !commentDraft.trim()}>
              {sendComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      <MobileBottomNav />

      <ImagePreviewLightbox
        open={lightbox.open}
        onOpenChange={(o) => setLightbox((s) => ({ ...s, open: o }))}
        urls={imageUrls}
        startIndex={lightbox.index}
      />

      <Dialog open={editComment !== null} onOpenChange={(o) => !o && setEditComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa bình luận</DialogTitle>
          </DialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            maxLength={2000}
            className={cn(
              'flex min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
              'resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditComment(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => patchComment.mutate()}
              disabled={patchComment.isPending || !editText.trim()}
            >
              {patchComment.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

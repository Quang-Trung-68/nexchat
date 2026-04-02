import { useRef, useState } from 'react'
import { BookMarked, LayoutList, Loader2, NotebookPen, Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { ChatGlobalSearchToolbarStandalone } from '@/features/chat/components/ChatGlobalSearchToolbar'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'
import { MobileBottomNav, mobileNavBottomPaddingClassName } from '@/shared/components/MobileBottomNav'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostComposerModal } from '../components/PostComposerModal'
import { NewsfeedPostsList } from '../components/NewsfeedPostsList'
import { postsInfiniteKeys } from '../queries/newsfeedQueryKeys'
import { useNewsfeedPendingStore } from '../store/newsfeedPending.store'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { cn } from '@/lib/utils'

export function NewsfeedPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const contactsPendingBadge = useContactsPendingBadge()
  const mainScrollRef = useRef<HTMLElement>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [postSearch, setPostSearch] = useState('')
  const debouncedNeedle = useDebouncedValue(postSearch, 500)
  const [tab, setTab] = useState<'timeline' | 'mine'>('timeline')
  const [refreshingNew, setRefreshingNew] = useState(false)

  const pendingCount = useNewsfeedPendingStore((s) => s.pendingCount)
  const resetPending = useNewsfeedPendingStore((s) => s.reset)

  const needle = debouncedNeedle.trim()

  const handleNewPostsBadgeClick = async () => {
    if (refreshingNew) return
    setRefreshingNew(true)
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      await queryClient.refetchQueries({
        queryKey: postsInfiniteKeys.list('timeline', needle),
      })
      resetPending()
    } finally {
      setRefreshingNew(false)
    }
  }

  const showNewBadge = tab === 'timeline' && pendingCount > 0

  return (
    <div
      className={cn(
        'flex h-dvh w-full overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] text-foreground',
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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'timeline' | 'mine')}
        className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row"
      >
        <aside className="flex max-h-[45%] min-h-0 w-full shrink-0 flex-col border-b border-border/80 bg-white md:h-full md:max-h-none md:max-w-[300px] md:border-b-0 md:border-r">
          <ChatGlobalSearchToolbarStandalone />

          <TabsList className="flex h-auto w-full shrink-0 flex-col items-stretch justify-start gap-0.5 rounded-none border-b border-border/50 bg-transparent p-1.5">
            <TabsTrigger
              value="timeline"
              className={cn(
                'flex h-auto min-h-11 w-full flex-nowrap items-center justify-start gap-2 rounded-md px-2 py-2 text-left text-sm font-medium shadow-none',
                'text-muted-foreground transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'data-[state=active]:bg-[#e5f0ff] data-[state=active]:text-[#0068ff] data-[state=active]:shadow-none',
                'hover:bg-muted/80 hover:text-foreground data-[state=active]:hover:bg-[#e5f0ff]'
              )}
            >
              <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 leading-snug">Dòng thời gian</span>
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className={cn(
                'flex h-auto min-h-11 w-full flex-nowrap items-center justify-start gap-2 rounded-md px-2 py-2 text-left text-sm font-medium shadow-none',
                'text-muted-foreground transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'data-[state=active]:bg-[#e5f0ff] data-[state=active]:text-[#0068ff] data-[state=active]:shadow-none',
                'hover:bg-muted/80 hover:text-foreground data-[state=active]:hover:bg-[#e5f0ff]'
              )}
            >
              <NotebookPen className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 leading-snug">Nhật ký của tôi</span>
            </TabsTrigger>
          </TabsList>
        </aside>

        <main
          ref={mainScrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-secondary-surface"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
            <BookMarked className="h-5 w-5 shrink-0 text-[#0068ff]" aria-hidden />
            <h1 className="text-base font-semibold text-foreground">Nhật ký</h1>
          </header>

          <div className="border-b border-border/50 bg-white px-4 py-2">
            <p className="text-sm text-muted-foreground">
              {tab === 'timeline' ? 'Dòng thời gian từ bạn bè' : 'Bài viết của bạn'}
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-2 flex w-full cursor-pointer rounded-lg border border-dashed border-border/80 bg-[#f4f5f7] px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/60"
            >
              Bạn cảm thấy thế nào?
            </button>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Lọc bài viết theo nội dung…"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="h-9 pl-8"
                aria-label="Lọc bài viết theo nội dung"
              />
            </div>
          </div>

          {showNewBadge ? (
            <div
              className="sticky z-20 flex justify-center px-2"
              style={{
                top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
              }}
            >
              <button
                type="button"
                onClick={() => void handleNewPostsBadgeClick()}
                disabled={refreshingNew}
                className="pointer-events-auto whitespace-nowrap rounded-full border border-[#0068ff]/25 bg-[#0068ff]/10 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-[#0068ff] shadow-sm transition-colors hover:bg-[#0068ff]/18 disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-1">
                  {refreshingNew ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  ) : null}
                  {refreshingNew
                    ? 'Đang tải…'
                    : `Có ${pendingCount > 99 ? '99+' : pendingCount} nhật ký mới`}
                </span>
              </button>
            </div>
          ) : null}

          <div className="mx-auto max-w-3xl px-4 py-3 lg:px-8">
            <NewsfeedPostsList scope={tab} debouncedSearch={debouncedNeedle} />
          </div>
        </main>
      </Tabs>

      <MobileBottomNav />
      <PostComposerModal open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  )
}

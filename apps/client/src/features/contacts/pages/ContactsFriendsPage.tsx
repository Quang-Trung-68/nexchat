import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { userDisplayName } from '@/lib/userDisplay'
import { useFriendsAcceptedQuery } from '@/features/friends/hooks/useFriendsAcceptedQuery'
import { deleteFriendship, type AcceptedFriendItem } from '@/features/friends/api/friends.api'
import { invalidateFriendQueries } from '@/features/friends/invalidateFriendQueries'
import { groupFriendsByLetter } from '@/features/contacts/utils/groupByLetter'

export function ContactsFriendsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useFriendsAcceptedQuery()
  const [filter, setFilter] = useState('')
  const [stubOpen, setStubOpen] = useState<'info' | 'alias' | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AcceptedFriendItem | null>(null)

  const filtered = useMemo(() => {
    const items = data?.items ?? []
    const q = filter.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => {
      const name = userDisplayName(row.user).toLowerCase()
      const un = row.user.username.toLowerCase()
      return name.includes(q) || un.includes(q)
    })
  }, [data?.items, filter])

  const grouped = useMemo(() => groupFriendsByLetter(filtered), [filtered])

  const removeMut = useMutation({
    mutationFn: (friendshipId: string) => deleteFriendship(friendshipId),
    onSuccess: () => {
      invalidateFriendQueries(queryClient)
      setDeleteTarget(null)
    },
  })

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
        <Users className="h-5 w-5 text-[#0068ff]" aria-hidden />
        <h1 className="text-base font-semibold">Danh sách bạn bè</h1>
      </header>

      <div className="border-b border-border/50 bg-white px-4 py-2">
        <p className="text-sm text-muted-foreground">
          Bạn bè ({data?.total ?? 0})
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Tìm bạn"
              className="h-9 pl-8"
              aria-label="Lọc danh sách bạn bè"
            />
          </div>
          <span className="rounded-md border border-border/80 bg-[#f4f5f7] px-2 py-1 text-xs text-muted-foreground">
            Tên (A - Z)
          </span>
          <span className="rounded-md border border-border/80 bg-[#f4f5f7] px-2 py-1 text-xs text-muted-foreground">
            Tất cả
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Không tải được danh sách bạn bè.</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filter.trim() ? 'Không có bạn bè khớp bộ lọc.' : 'Chưa có bạn bè.'}
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ letter, items: rows }) => (
                <section key={letter}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {letter}
                  </h2>
                  <ul className="space-y-1">
                    {rows.map((row) => (
                      <li
                        key={row.friendshipId}
                        className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-border/40"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          {row.user.avatarUrl ? (
                            <AvatarImage src={row.user.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {userDisplayName(row.user).slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {userDisplayName(row.user)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{row.user.username}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground"
                              aria-label="Thêm thao tác"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setStubOpen('info')
                              }}
                            >
                              Xem thông tin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (row.dmConversationId) {
                                  navigate(`/chat/${row.dmConversationId}`)
                                } else {
                                  navigate('/chat')
                                }
                              }}
                            >
                              Nhắn tin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setStubOpen('alias')
                              }}
                            >
                              Đặt tên gợi nhớ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setBlockOpen(true)}
                            >
                              Chặn
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              Xóa bạn
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={stubOpen !== null} onOpenChange={(o) => !o && setStubOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stubOpen === 'info' ? 'Xem thông tin' : 'Đặt tên gợi nhớ'}
            </DialogTitle>
            <DialogDescription>Tính năng sắp có.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setStubOpen(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="border-destructive/40 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Chặn người này?</DialogTitle>
            <DialogDescription>
              Tính năng chặn sắp có. Bạn sẽ không thể nhận tin nhắn từ người bị chặn sau khi triển khai.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBlockOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-destructive/40 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa bạn?</DialogTitle>
            <DialogDescription>
              Hủy kết bạn với{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget ? userDisplayName(deleteTarget.user) : ''}
              </span>
              ? Bạn có thể gửi lời mời lại sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMut.isPending}
              onClick={() => {
                if (deleteTarget) removeMut.mutate(deleteTarget.friendshipId)
              }}
            >
              {removeMut.isPending ? 'Đang xóa…' : 'Xóa bạn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { UserPlus } from 'lucide-react'
import { USER_LOOKUP } from '@chat-app/shared-constants'
import {
  fetchRelationship,
  fetchUserLookup,
  postAcceptFriend,
  postFriendRequest,
  deleteFriendship,
  friendshipToOutgoingRow,
  type FriendsPendingPayload,
} from '@/features/friends/api/friends.api'
import { friendsKeys } from '@/features/friends/friends.keys'
import {
  invalidateFriendQueries,
  refetchPendingFriends,
} from '@/features/friends/invalidateFriendQueries'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { userDisplayName } from '@/lib/userDisplay'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function AddFriendDialog() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const debouncedQ = useDebouncedValue(q.trim(), USER_LOOKUP.DEBOUNCE_MS)

  const canLookup =
    open &&
    debouncedQ.length >= USER_LOOKUP.MIN_QUERY_LENGTH &&
    debouncedQ.length <= USER_LOOKUP.MAX_QUERY_LENGTH

  const lookupQuery = useQuery({
    queryKey: ['userLookup', debouncedQ],
    queryFn: () => fetchUserLookup(debouncedQ),
    enabled: canLookup,
    staleTime: 15_000,
  })

  const foundUser = lookupQuery.data?.user ?? null

  const relationshipQuery = useQuery({
    queryKey: friendsKeys.relationship(foundUser?.id ?? '_'),
    queryFn: () => fetchRelationship(foundUser!.id),
    enabled: open && Boolean(foundUser?.id),
    staleTime: 10_000,
  })

  const rel = relationshipQuery.data

  const invalidateFriend = () => {
    invalidateFriendQueries(queryClient)
    void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
  }

  const requestMut = useMutation({
    mutationFn: (addresseeId: string) => postFriendRequest(addresseeId),
    onSuccess: (data, addresseeId) => {
      if (!data.mutual && data.friendship) {
        const row = friendshipToOutgoingRow(data.friendship)
        queryClient.setQueryData<FriendsPendingPayload>(friendsKeys.pending(), (old) => {
          const prev = old ?? { incoming: [], outgoing: [] }
          if (prev.outgoing.some((r) => r.id === row.id)) return prev
          return { incoming: prev.incoming, outgoing: [row, ...prev.outgoing] }
        })
      }
      invalidateFriend()
      void refetchPendingFriends(queryClient)
      void queryClient.invalidateQueries({ queryKey: friendsKeys.relationship(addresseeId) })
      if (data.mutual && data.conversationId) {
        setOpen(false)
        setQ('')
        navigate(`/chat/${data.conversationId}`)
      }
    },
  })

  const acceptMut = useMutation({
    mutationFn: (friendshipId: string) => postAcceptFriend(friendshipId),
    onSuccess: (data) => {
      invalidateFriend()
      if (foundUser) {
        void queryClient.invalidateQueries({ queryKey: friendsKeys.relationship(foundUser.id) })
      }
      setOpen(false)
      setQ('')
      navigate(`/chat/${data.conversationId}`)
    },
  })

  const removeMut = useMutation({
    mutationFn: (friendshipId: string) => deleteFriendship(friendshipId),
    onSuccess: (_d, _id) => {
      invalidateFriend()
      if (foundUser) {
        void queryClient.invalidateQueries({ queryKey: friendsKeys.relationship(foundUser.id) })
      }
    },
  })

  const showHint =
    q.trim().length > 0 && q.trim().length < USER_LOOKUP.MIN_QUERY_LENGTH

  const showNoMatch =
    canLookup &&
    !lookupQuery.isFetching &&
    !foundUser &&
    !lookupQuery.isError

  const errMsg = useMemo(() => {
    const e = requestMut.error ?? acceptMut.error ?? removeMut.error
    if (!e || !axios.isAxiosError(e)) return null
    const msg = e.response?.data as { error?: { message?: string } } | undefined
    return msg?.error?.message ?? 'Đã có lỗi xảy ra'
  }, [requestMut.error, acceptMut.error, removeMut.error])

  useEffect(() => {
    if (!open) {
      setQ('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 text-muted-foreground hover:bg-[#e5f0ff] hover:text-foreground"
          aria-label="Thêm bạn"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm bạn</DialogTitle>
          <DialogDescription>
            Nhập chính xác tên người dùng, email hoặc số điện thoại (không gợi ý danh sách).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm với tên người dùng, email hoặc số điện thoại..."
            autoComplete="off"
            aria-label="Tìm người dùng để thêm bạn"
          />
          {showHint ? (
            <p className="text-xs text-muted-foreground">
              Nhập ít nhất {USER_LOOKUP.MIN_QUERY_LENGTH} ký tự.
            </p>
          ) : null}
          {lookupQuery.isFetching && canLookup ? (
            <p className="text-sm text-muted-foreground">Đang tìm…</p>
          ) : null}
          {showNoMatch ? (
            <p className="text-sm text-muted-foreground">
              Không có người dùng phù hợp với từ khóa tìm kiếm.
            </p>
          ) : null}
          {lookupQuery.isError ? (
            <p className="text-sm text-destructive">Không tải được. Thử lại sau.</p>
          ) : null}

          {foundUser ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-[#f8f9fb] p-3">
              <Avatar className="h-10 w-10">
                {foundUser.avatarUrl ? (
                  <AvatarImage src={foundUser.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-xs">
                  {userDisplayName(foundUser).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{userDisplayName(foundUser)}</p>
                <p className="truncate text-xs text-muted-foreground">@{foundUser.username}</p>
              </div>
            </div>
          ) : null}

          {foundUser && relationshipQuery.isFetching ? (
            <p className="text-xs text-muted-foreground">Đang tải trạng thái…</p>
          ) : null}

          {foundUser && rel ? (
            <div className="flex flex-col gap-2">
              {rel.status === 'none' ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={requestMut.isPending}
                  onClick={() => requestMut.mutate(foundUser.id)}
                >
                  Gửi lời mời kết bạn
                </Button>
              ) : null}

              {rel.status === 'pending_out' && rel.friendshipId ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Đã gửi lời mời — chờ phản hồi.</p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={removeMut.isPending}
                    onClick={() => removeMut.mutate(rel.friendshipId!)}
                  >
                    Thu hồi lời mời
                  </Button>
                </div>
              ) : null}

              {rel.status === 'pending_in' && rel.friendshipId ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={acceptMut.isPending}
                    onClick={() => acceptMut.mutate(rel.friendshipId!)}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={removeMut.isPending}
                    onClick={() => removeMut.mutate(rel.friendshipId!)}
                  >
                    Từ chối
                  </Button>
                </div>
              ) : null}

              {rel.status === 'accepted' ? (
                <p className="text-sm text-muted-foreground">Hai bạn đã là bạn bè.</p>
              ) : null}

              {rel.status === 'blocked' ? (
                <p className="text-sm text-muted-foreground">Không thể gửi lời mời.</p>
              ) : null}
            </div>
          ) : null}

          {errMsg ? <p className="text-sm text-destructive">{errMsg}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

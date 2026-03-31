import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { InfiniteData } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { usePendingImageUploadsStore } from '@/features/messages/store/pendingImageUploads.store'
import { MAX_PINS_PER_CONVERSATION } from '@chat-app/shared-constants'
import { ChevronDown, Loader2, PanelRight, Phone, Pin, Search, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useSocket } from '@/features/sockets/useSocket'
import { useRoomReadSync } from '@/features/rooms/hooks/useRoomReadSync'
import type { MessagesPageDto } from '@/features/messages/api/messages.api'
import {
  messagesInfiniteKeys,
  useRoomMessagesInfinite,
} from '@/features/messages/queries/useRoomMessagesInfinite'
import { useMergedRoomMessages } from '@/features/messages/hooks/useMergedRoomMessages'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { getDmMentionLine, getRoomTitle } from '../utils/roomTitle'
import { formatDaySeparator, formatMessageTime } from '../utils/format'
import { resolveParentPreview } from '../utils/parentPreview'
import { ChatComposer, type ChatComposerHandle } from './ChatComposer'
import { ImagePreviewLightbox } from './ImagePreviewLightbox'
import { MessageImageGrid } from './MessageImageGrid'
import { MessageQuote } from './MessageQuote'
import { MessageBubbleActions } from './MessageBubbleActions'
import { MessageReactionHoverLayer } from './MessageReactions'
import { useRealtimeMessagesStore } from '@/features/messages/store/realtimeMessages.store'
import { cn } from '@/lib/utils'
import { EMPTY_STRING_ARRAY } from '@/lib/zustandEmpty'
import { displayNameForMessageSender, userDisplayName } from '@/lib/userDisplay'
import { useRoomPinMutations, useRoomPinsQuery } from '@/features/rooms/queries/useRoomPins'

type ChatThreadProps = {
  conversationId: string
  room: RoomListItem | undefined
  currentUserId: string | undefined
  onToggleRightPanel: () => void
  rightPanelOpen: boolean
  /** Bật/tắt khối tìm kiếm trong panel phải. */
  roomSearchOpen: boolean
  onToggleRoomSearch: () => void
  /** Đăng ký hàm cuộn tới tin (panel phải / nơi khác). */
  onScrollToMessageReady?: (scrollTo: (messageId: string) => Promise<void>) => void
}

const NEAR_BOTTOM_PX = 100

function groupMessagesByDay(messages: MessageItemDto[]) {
  const groups: { dayKey: string; items: MessageItemDto[] }[] = []
  for (const m of messages) {
    const d = new Date(m.createdAt)
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const last = groups[groups.length - 1]
    if (!last || last.dayKey !== dayKey) {
      groups.push({ dayKey, items: [m] })
    } else {
      last.items.push(m)
    }
  }
  return groups
}

function sortedAttachmentUrls(m: MessageItemDto): string[] {
  if (!m.attachments?.length) return []
  return [...m.attachments].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => a.url)
}

function imageCountForMessage(m: MessageItemDto): number {
  const urls = sortedAttachmentUrls(m)
  if (urls.length > 0) return urls.length
  if (m.fileUrl && m.fileType === 'IMAGE') return 1
  return 0
}

export function ChatThread({
  conversationId,
  room,
  currentUserId,
  onToggleRightPanel,
  rightPanelOpen,
  roomSearchOpen,
  onToggleRoomSearch,
  onScrollToMessageReady,
}: ChatThreadProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { socket, connected } = useSocket()
  useRoomReadSync(socket, connected, conversationId)

  const infinite = useRoomMessagesInfinite(conversationId)
  const merged = useMergedRoomMessages(conversationId, infinite.data?.pages)
  const mergedRef = useRef(merged)
  mergedRef.current = merged

  const [initialRevealDone, setInitialRevealDone] = useState(false)
  /** visible → fading (opacity) → hidden (unmount) — tránh tắt skeleton đột ngột khi đổi hội thoại */
  const [skelPhase, setSkelPhase] = useState<'visible' | 'fading' | 'hidden'>('visible')
  const [isNearBottom, setIsNearBottom] = useState(true)
  /** Id tin nhắn cuối khi user còn ở đáy — dùng để phát hiện tin mới khi đã kéo lên. */
  const [anchorAtBottomId, setAnchorAtBottomId] = useState<string | null>(null)

  const typingIds = useTypingPresenceStore((s) => {
    const list = s.typingByConversation[conversationId]
    return list ?? EMPTY_STRING_ARRAY
  })
  const typingOthers = typingIds.filter((id) => id !== currentUserId)

  const clearPendingForSyncedAttachments = usePendingImageUploadsStore((s) => s.clear)
  const pendingByMessageId = usePendingImageUploadsStore((s) => s.byMessageId)
  const [lightbox, setLightbox] = useState<{
    urls: string[]
    startIndex: number
  } | null>(null)
  const title = room ? getRoomTitle(room, currentUserId) : 'Đang tải…'
  const mentionLine = room ? getDmMentionLine(room, currentUserId) : null
  const groups = useMemo(() => groupMessagesByDay(merged), [merged])
  const mergedTailId = merged[merged.length - 1]?.id ?? ''

  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesContentRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<ChatComposerHandle>(null)
  const infiniteRef = useRef(infinite)
  infiniteRef.current = infinite

  const [replyingTo, setReplyingTo] = useState<MessageItemDto | null>(null)
  const [isLoadingParentScroll, setIsLoadingParentScroll] = useState(false)
  const [parentNavError, setParentNavError] = useState<string | null>(null)

  const { data: pinsData = [] } = useRoomPinsQuery(conversationId)
  const { pin: pinMut, unpin: unpinMut } = useRoomPinMutations(conversationId)
  const pinnedIds = useMemo(() => new Set(pinsData.map((p) => p.messageId)), [pinsData])
  const pinSlotsLeft = pinsData.length < MAX_PINS_PER_CONVERSATION

  const messageInRoomCache = useCallback(
    (messageId: string) => {
      const data = queryClient.getQueryData<InfiniteData<MessagesPageDto>>(
        messagesInfiniteKeys.room(conversationId)
      )
      if (data?.pages.some((p) => p.messages.some((msg) => msg.id === messageId))) return true
      const rt = useRealtimeMessagesStore.getState().byConversation[conversationId] ?? []
      return rt.some((msg) => msg.id === messageId)
    },
    [conversationId, queryClient]
  )

  const scrollToMessageInThread = useCallback(
    async (targetId: string) => {
      const scrollOnce = () => {
        const root = scrollRef.current
        if (!root) return false
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(targetId)
            : targetId
        const el = root.querySelector(`[data-message-id="${escaped}"]`)
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return true
        }
        return false
      }

      if (scrollOnce()) return

      if (!messageInRoomCache(targetId)) {
        setIsLoadingParentScroll(true)
        setParentNavError(null)
        try {
          let safety = 0
          while (!messageInRoomCache(targetId) && safety < 120) {
            safety += 1
            const q = infiniteRef.current
            if (!q.hasNextPage) break
            if (q.isFetchingNextPage) {
              await new Promise((r) => setTimeout(r, 40))
              continue
            }
            await q.fetchNextPage()
          }
          if (!messageInRoomCache(targetId)) {
            setParentNavError('Không tìm thấy tin nhắn gốc trong đoạn đã tải.')
            window.setTimeout(() => setParentNavError(null), 4000)
            return
          }
        } finally {
          setIsLoadingParentScroll(false)
        }
      }

      for (let i = 0; i < 50; i++) {
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
        if (scrollOnce()) return
      }
      setParentNavError('Không cuộn tới được tin nhắn gốc.')
      window.setTimeout(() => setParentNavError(null), 4000)
    },
    [messageInRoomCache]
  )

  useEffect(() => {
    setReplyingTo(null)
  }, [conversationId])

  useEffect(() => {
    onScrollToMessageReady?.(scrollToMessageInThread)
  }, [onScrollToMessageReady, scrollToMessageInThread])

  const focusMessageId = (location.state as { focusMessageId?: string } | null)?.focusMessageId
  const focusHandledKeyRef = useRef<string | null>(null)
  useEffect(() => {
    focusHandledKeyRef.current = null
  }, [conversationId])

  useEffect(() => {
    if (!focusMessageId) focusHandledKeyRef.current = null
  }, [focusMessageId])

  useEffect(() => {
    if (!focusMessageId) return
    const key = `${conversationId}:${focusMessageId}`
    if (focusHandledKeyRef.current === key) return
    focusHandledKeyRef.current = key
    let cancelled = false
    void scrollToMessageInThread(focusMessageId).finally(() => {
      if (!cancelled) {
        navigate(
          { pathname: location.pathname, search: location.search },
          { replace: true, state: {} }
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [focusMessageId, conversationId, scrollToMessageInThread, navigate, location.pathname, location.search])

  /** Focus ô nhập khi chọn hội thoại khác. */
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => composerRef.current?.focus())
    )
    return () => cancelAnimationFrame(id)
  }, [conversationId])

  /** Focus ô nhập khi bấm Trả lời. */
  useEffect(() => {
    if (!replyingTo) return
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => composerRef.current?.focus())
    )
    return () => cancelAnimationFrame(id)
  }, [replyingTo])
  /** Đồng bộ với isNearBottom — dùng trong effect tin mới (tránh stale). */
  const isNearBottomRef = useRef(true)
  const prevLastMsgIdRef = useRef<string | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    const finish = () => {
      if (behavior === 'auto') {
        el.scrollTop = el.scrollHeight
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior })
      }
      const last = mergedRef.current[mergedRef.current.length - 1]
      setAnchorAtBottomId(last?.id ?? null)
      setIsNearBottom(true)
      isNearBottomRef.current = true
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
  }, [])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = dist <= NEAR_BOTTOM_PX
    setIsNearBottom(near)
    isNearBottomRef.current = near
    if (near) {
      const last = mergedRef.current[mergedRef.current.length - 1]
      setAnchorAtBottomId(last?.id ?? null)
    }
  }, [])

  useEffect(() => {
    setInitialRevealDone(false)
    setSkelPhase('visible')
    setIsNearBottom(true)
    isNearBottomRef.current = true
    setAnchorAtBottomId(null)
    prevLastMsgIdRef.current = null
  }, [conversationId])

  useEffect(() => {
    if (!initialRevealDone || skelPhase !== 'visible') return
    const id = requestAnimationFrame(() => {
      setSkelPhase('fading')
    })
    return () => cancelAnimationFrame(id)
  }, [initialRevealDone, skelPhase])

  /** Cuộn xuống đáy trước khi paint — tắt skeleton sau đó để không thấy hiệu ứng cuộn. */
  useLayoutEffect(() => {
    if (initialRevealDone) return
    if (infinite.isLoading || !infinite.isFetched) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    const last = mergedRef.current[mergedRef.current.length - 1]
    setAnchorAtBottomId(last?.id ?? null)
    setIsNearBottom(true)
    isNearBottomRef.current = true
    setInitialRevealDone(true)
  }, [
    conversationId,
    infinite.isLoading,
    infinite.isFetched,
    initialRevealDone,
    merged.length,
    mergedTailId,
  ])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      updateScrollState()
      const q = infiniteRef.current
      if (el.scrollTop < 80 && q.hasNextPage && !q.isFetchingNextPage) {
        void q.fetchNextPage()
      }
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [conversationId, updateScrollState])

  /**
   * Khi nội dung (ảnh) làm scrollHeight tăng — nếu user đang ở gần đáy thì bám đáy
   * (mở room có tin ảnh cuối, upload ảnh xong, đối phương gửi ảnh khi mình đang gần đáy).
   */
  useEffect(() => {
    const root = scrollRef.current
    const content = messagesContentRef.current
    if (!root || !content || !initialRevealDone) return
    const ro = new ResizeObserver(() => {
      if (!isNearBottomRef.current) return
      root.scrollTop = root.scrollHeight
      const last = mergedRef.current[mergedRef.current.length - 1]
      setAnchorAtBottomId(last?.id ?? null)
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [conversationId, initialRevealDone, merged.length])

  /** Đang ở đáy: neo theo tin mới nhất (gửi/nhận). */
  useEffect(() => {
    if (!initialRevealDone || !isNearBottom) return
    const last = merged[merged.length - 1]
    if (last) setAnchorAtBottomId(last.id)
  }, [merged, initialRevealDone, isNearBottom])

  /**
   * Tin mới từ người khác + đang ở đáy (chưa hiện nút mũi tên) → cuộn mượt theo tin.
   * Không chạy lần đầu sau khi mở room (prevLastMsgIdRef === null).
   */
  useEffect(() => {
    if (!initialRevealDone) return
    const last = merged[merged.length - 1]
    if (!last) {
      prevLastMsgIdRef.current = null
      return
    }
    const prev = prevLastMsgIdRef.current
    if (prev === null) {
      prevLastMsgIdRef.current = last.id
      return
    }
    if (prev === last.id) return

    prevLastMsgIdRef.current = last.id

    if (last.sender.id === currentUserId) return
    if (!isNearBottomRef.current) return

    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        setAnchorAtBottomId(last.id)
        setIsNearBottom(true)
        isNearBottomRef.current = true
      })
    })
  }, [mergedTailId, merged.length, initialRevealDone, currentUserId])

  const lastMsg = merged.length > 0 ? merged[merged.length - 1] : null

  const typingLine = useMemo(() => {
    if (typingOthers.length === 0) return null
    const labels = typingOthers.map((id) => {
      const p = room?.participants.find((x) => x.id === id)
      return p ? userDisplayName(p) : '…'
    })
    return labels.length === 1
      ? `${labels[0]} đang nhập…`
      : `${labels.join(', ')} đang nhập…`
  }, [typingOthers, room?.participants])

  /** Giữa khung: mũi tên / preview tin (tin chỉ ảnh: “… đã gửi N ảnh”). */
  const floatingCenterUi = useMemo(() => {
    if (isNearBottom || !lastMsg) return null
    if (anchorAtBottomId !== null && lastMsg.id !== anchorAtBottomId) {
      const name = displayNameForMessageSender(lastMsg.sender, room?.participants)
      const text = (lastMsg.content ?? '').trim()
      const nImg = imageCountForMessage(lastMsg)
      if (text) {
        return { kind: 'text' as const, text: `${name}: ${text.slice(0, 48)}` }
      }
      if (nImg > 0) {
        const photoLabel = nImg === 1 ? '1 ảnh' : `${nImg} ảnh`
        return { kind: 'text' as const, text: `${name} đã gửi ${photoLabel}` }
      }
      return { kind: 'arrow' as const, text: '' }
    }
    return { kind: 'arrow' as const, text: '' }
  }, [lastMsg, anchorAtBottomId, isNearBottom, room?.participants])

  const showFloatingCenter =
    initialRevealDone &&
    floatingCenterUi !== null &&
    !isNearBottom &&
    merged.length > 0

  const showTypingChip = initialRevealDone && Boolean(typingLine)

  useEffect(() => {
    for (const m of merged) {
      if (m.attachments?.length) clearPendingForSyncedAttachments(m.id)
    }
  }, [merged, clearPendingForSyncedAttachments])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white motion-reduce:transition-none">
      <header className="relative z-20 flex shrink-0 flex-col border-b border-border/60 py-2">
        <div className="flex items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-[#0068ff]/15 text-sm font-medium text-[#0068ff]">
                {title.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
              {mentionLine ? (
                <p className="truncate text-xs text-muted-foreground">{mentionLine}</p>
              ) : room ? (
                <p className="text-xs text-muted-foreground">
                  {room.type === 'GROUP' ? `${room.participants.length} thành viên` : '1–1'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">…</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
              title="Cuộc gọi (sắp có)"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled title="Gọi video (sắp có)">
              <Video className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                roomSearchOpen && 'bg-blue-50 text-[#0068ff] hover:bg-blue-100 hover:text-[#0068ff]'
              )}
              onClick={onToggleRoomSearch}
              title="Tìm trong hội thoại"
              aria-expanded={roomSearchOpen}
              aria-label="Tìm trong hội thoại"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', rightPanelOpen && 'bg-blue-50 text-[#0068ff] hover:bg-blue-100 hover:text-[#0068ff]')}
              onClick={onToggleRightPanel}
              title="Thông tin hội thoại"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="relative h-full min-h-0 scroll-auto overflow-y-auto bg-[#ebf0f5] px-4 py-3"
        >
          {isLoadingParentScroll ? (
            <div
              className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-background/45 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:backdrop-blur-none"
              aria-busy
              aria-label="Đang tải tin nhắn cũ"
            >
              <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          {initialRevealDone && pinsData.length > 0 ? (
            <div className="sticky top-0 z-5 -mx-4 mb-2 bg-[#606060] px-3 py-1.5 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                <Pin className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <span className="sr-only">Tin đã ghim</span>
                {pinsData.map((p) => (
                  <button
                    key={p.messageId}
                    type="button"
                    onClick={() => void scrollToMessageInThread(p.messageId)}
                    className="max-w-[min(100%,14rem)] shrink-0 truncate rounded-full border-0 bg-zinc-700 px-2.5 py-0.5 text-left text-xs text-white transition-colors hover:bg-zinc-600"
                    title={p.preview}
                  >
                    {p.preview}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {!infinite.isLoading && merged.length === 0 && initialRevealDone ? (
            <p
              className={cn(
                'text-center text-sm text-muted-foreground',
                'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-400 motion-safe:ease-out'
              )}
            >
              Chưa có tin nhắn
            </p>
          ) : null}

          {initialRevealDone && infinite.isFetchingNextPage ? (
            <p className="mb-2 text-center text-xs text-muted-foreground">Đang tải tin cũ…</p>
          ) : null}

          {!infinite.isLoading && merged.length > 0 ? (
            <div ref={messagesContentRef} key={conversationId}>
              {groups.map((g) => (
                <div key={g.dayKey} className="mb-4">
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full bg-white/80 px-3 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                      {formatDaySeparator(g.items[0].createdAt)}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {g.items.map((m) => {
                      const mine = m.sender.id === currentUserId
                      const senderLabel = displayNameForMessageSender(m.sender, room?.participants)
                      const parentPreview = resolveParentPreview(m, merged)
                      return (
                        <li
                          key={m.id}
                          data-message-id={m.id}
                          className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
                        >
                          {!mine ? (
                            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                              {m.sender.avatarUrl ? (
                                <AvatarImage src={m.sender.avatarUrl} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {senderLabel.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                          <div
                            className={cn(
                              'group/msg flex w-max max-w-[min(100%,28rem)] items-end gap-1.5'
                            )}
                          >
                            {mine ? (
                              <>
                                <MessageBubbleActions
                                  conversationId={conversationId}
                                  message={m}
                                  mine={mine}
                                  isPinned={pinnedIds.has(m.id)}
                                  pinSlotsLeft={pinSlotsLeft}
                                  pinPending={pinMut.isPending}
                                  unpinPending={unpinMut.isPending}
                                  onReply={() => setReplyingTo(m)}
                                  onPin={() => pinMut.mutate(m.id)}
                                  onUnpin={() => unpinMut.mutate(m.id)}
                                />
                                <div className="relative w-fit max-w-full min-w-0 pb-3">
                            <div
                              className={cn(
                                'rounded-2xl px-3 py-2 text-sm',
                                mine
                                  ? 'rounded-br-sm bg-[#0068ff] text-white shadow-sm'
                                  : 'rounded-bl-sm border-0 bg-white text-foreground shadow-sm'
                              )}
                            >
                              {parentPreview ? (
                                <div className={cn('mb-2', !mine && '-mx-0.5')}>
                                  <MessageQuote
                                    preview={parentPreview}
                                    mine={mine}
                                    onNavigate={
                                      parentPreview.isDeleted
                                        ? undefined
                                        : () => void scrollToMessageInThread(parentPreview.id)
                                    }
                                  />
                                </div>
                              ) : null}
                              {!mine ? (
                                <p className="mb-1 text-xs font-medium text-[#0068ff]">{senderLabel}</p>
                              ) : null}
                              {m.content ? (
                                <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
                              ) : null}
                              {(() => {
                                const pending = pendingByMessageId[m.id]
                                const serverUrls = sortedAttachmentUrls(m)
                                const legacySingle =
                                  serverUrls.length === 0 &&
                                    m.fileUrl &&
                                    m.fileType === 'IMAGE'
                                    ? [m.fileUrl]
                                    : []
                                const displayUrls =
                                  serverUrls.length > 0
                                    ? serverUrls
                                    : legacySingle.length > 0
                                      ? legacySingle
                                      : (pending?.previewUrls ?? [])
                                const imageLoading =
                                  Boolean(pending?.previewUrls?.length) &&
                                  serverUrls.length === 0 &&
                                  legacySingle.length === 0
                                if (displayUrls.length === 0 && !imageLoading) return null
                                return (
                                  <div className={cn(m.content ? 'mt-2' : '')}>
                                    <MessageImageGrid
                                      urls={displayUrls}
                                      totalCount={displayUrls.length}
                                      loading={imageLoading}
                                      onPhotoClick={(idx) =>
                                        setLightbox({
                                          urls: displayUrls,
                                          startIndex: Math.min(idx, displayUrls.length - 1),
                                        })
                                      }
                                    />
                                  </div>
                                )
                              })()}
                              <div
                                className={cn(
                                  'mt-1 text-[10px]',
                                  mine ? 'text-white/70' : 'text-muted-foreground/80'
                                )}
                              >
                                <span>{formatMessageTime(m.createdAt)}</span>
                              </div>
                            </div>
                            <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="relative w-fit max-w-full min-w-0 pb-3">
                            <div
                              className={cn(
                                'rounded-2xl px-3 py-2 text-sm',
                                mine
                                  ? 'rounded-br-sm bg-[#0068ff] text-white shadow-sm'
                                  : 'rounded-bl-sm border-0 bg-white text-foreground shadow-sm'
                              )}
                            >
                              {parentPreview ? (
                                <div className={cn('mb-2', !mine && '-mx-0.5')}>
                                  <MessageQuote
                                    preview={parentPreview}
                                    mine={mine}
                                    onNavigate={
                                      parentPreview.isDeleted
                                        ? undefined
                                        : () => void scrollToMessageInThread(parentPreview.id)
                                    }
                                  />
                                </div>
                              ) : null}
                              {!mine ? (
                                <p className="mb-1 text-xs font-medium text-[#0068ff]">{senderLabel}</p>
                              ) : null}
                              {m.content ? (
                                <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
                              ) : null}
                              {(() => {
                                const pending = pendingByMessageId[m.id]
                                const serverUrls = sortedAttachmentUrls(m)
                                const legacySingle =
                                  serverUrls.length === 0 &&
                                    m.fileUrl &&
                                    m.fileType === 'IMAGE'
                                    ? [m.fileUrl]
                                    : []
                                const displayUrls =
                                  serverUrls.length > 0
                                    ? serverUrls
                                    : legacySingle.length > 0
                                      ? legacySingle
                                      : (pending?.previewUrls ?? [])
                                const imageLoading =
                                  Boolean(pending?.previewUrls?.length) &&
                                  serverUrls.length === 0 &&
                                  legacySingle.length === 0
                                if (displayUrls.length === 0 && !imageLoading) return null
                                return (
                                  <div className={cn(m.content ? 'mt-2' : '')}>
                                    <MessageImageGrid
                                      urls={displayUrls}
                                      totalCount={displayUrls.length}
                                      loading={imageLoading}
                                      onPhotoClick={(idx) =>
                                        setLightbox({
                                          urls: displayUrls,
                                          startIndex: Math.min(idx, displayUrls.length - 1),
                                        })
                                      }
                                    />
                                  </div>
                                )
                              })()}
                              <div
                                className={cn(
                                  'mt-1 text-[10px]',
                                  mine ? 'text-white/70' : 'text-muted-foreground/80'
                                )}
                              >
                                <span>{formatMessageTime(m.createdAt)}</span>
                              </div>
                            </div>
                            <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
                                </div>
                                <MessageBubbleActions
                                  conversationId={conversationId}
                                  message={m}
                                  mine={mine}
                                  isPinned={pinnedIds.has(m.id)}
                                  pinSlotsLeft={pinSlotsLeft}
                                  pinPending={pinMut.isPending}
                                  unpinPending={unpinMut.isPending}
                                  onReply={() => setReplyingTo(m)}
                                  onPin={() => pinMut.mutate(m.id)}
                                  onUnpin={() => unpinMut.mutate(m.id)}
                                />
                              </>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {skelPhase !== 'hidden' ? (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-10 flex flex-col bg-[#ebf0f5] px-4 py-3 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
                skelPhase === 'fading' ? 'opacity-0' : 'opacity-100'
              )}
              aria-hidden
              onTransitionEnd={(e) => {
                if (e.propertyName !== 'opacity') return
                if (skelPhase === 'fading') setSkelPhase('hidden')
              }}
            >
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={cn('flex gap-2', i % 2 === 0 ? 'flex-row-reverse' : '')}
                  >
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full opacity-90" />
                    <Skeleton className="h-16 max-w-[70%] flex-1 rounded-2xl opacity-90" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {showTypingChip && typingLine ? (
          <div
            className="pointer-events-none absolute bottom-1 left-2 z-20 max-w-[min(calc(100%-1rem),17rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
            aria-live="polite"
          >
            <span className="inline-block max-w-full truncate rounded-full border-0 bg-white px-2 py-0.5 text-[11px] leading-snug text-muted-foreground shadow-sm backdrop-blur-sm transition-shadow duration-200">
              {typingLine}
            </span>
          </div>
        ) : null}

        {parentNavError ? (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-30 max-w-[min(100%,20rem)] -translate-x-1/2 rounded-md bg-destructive/95 px-3 py-1.5 text-center text-xs text-destructive-foreground shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200">
            {parentNavError}
          </div>
        ) : null}

        {showFloatingCenter && floatingCenterUi ? (
          <div
            className={cn(
              'pointer-events-none absolute left-0 right-0 z-20 flex justify-center px-4 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200',
              showTypingChip ? 'bottom-14' : 'bottom-3'
            )}
          >
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="pointer-events-auto flex max-w-[min(100%,24rem)] min-h-[40px] items-center gap-2 rounded-full border border-border bg-white/95 px-4 py-2 text-left text-sm shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:bg-white hover:shadow-lg active:scale-[0.98]"
            >
              {floatingCenterUi.kind === 'arrow' ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-[#0068ff]" aria-hidden />
              ) : null}
              {floatingCenterUi.kind === 'text' ? (
                <span className="truncate text-foreground">{floatingCenterUi.text}</span>
              ) : null}
              {floatingCenterUi.kind === 'arrow' ? (
                <span className="sr-only">Xuống cuối hội thoại</span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      <ChatComposer
        ref={composerRef}
        conversationId={conversationId}
        socket={socket}
        connected={connected}
        currentUserId={currentUserId}
        roomTitle={title}
        replyingTo={replyingTo}
        onReplyingToChange={setReplyingTo}
        onAfterSend={() => scrollToBottom('smooth')}
      />

      <ImagePreviewLightbox
        open={lightbox !== null}
        onOpenChange={(o) => {
          if (!o) setLightbox(null)
        }}
        urls={lightbox?.urls ?? []}
        startIndex={lightbox?.startIndex ?? 0}
      />
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePendingImageUploadsStore } from '@/features/messages/store/pendingImageUploads.store'
import { ChevronDown, PanelRight, Search, UserPlus, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useSocket } from '@/features/sockets/useSocket'
import { useRoomReadSync } from '@/features/rooms/hooks/useRoomReadSync'
import { useRoomMessagesInfinite } from '@/features/messages/queries/useRoomMessagesInfinite'
import { useMergedRoomMessages } from '@/features/messages/hooks/useMergedRoomMessages'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { getDmMentionLine, getRoomTitle } from '../utils/roomTitle'
import { formatDaySeparator, formatMessageTime } from '../utils/format'
import { ChatComposer } from './ChatComposer'
import { ImagePreviewLightbox } from './ImagePreviewLightbox'
import { MessageImageGrid } from './MessageImageGrid'
import { MessageReactionHoverLayer } from './MessageReactions'
import { cn } from '@/lib/utils'
import { EMPTY_STRING_ARRAY } from '@/lib/zustandEmpty'
import { displayNameForMessageSender, userDisplayName } from '@/lib/userDisplay'

type ChatThreadProps = {
  conversationId: string
  room: RoomListItem | undefined
  currentUserId: string | undefined
  onToggleRightPanel: () => void
  rightPanelOpen: boolean
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

export function ChatThread({
  conversationId,
  room,
  currentUserId,
  onToggleRightPanel,
  rightPanelOpen,
}: ChatThreadProps) {
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
  /** Tăng khi chuột rời hết khối tin (bubble + reaction float) — đóng menu vuông reaction. */
  const [reactionShellLeaveByMessageId, setReactionShellLeaveByMessageId] = useState<
    Record<string, number>
  >({})

  const title = room ? getRoomTitle(room, currentUserId) : 'Đang tải…'
  const mentionLine = room ? getDmMentionLine(room, currentUserId) : null
  const groups = useMemo(() => groupMessagesByDay(merged), [merged])
  const mergedTailId = merged[merged.length - 1]?.id ?? ''

  const scrollRef = useRef<HTMLDivElement>(null)
  const infiniteRef = useRef(infinite)
  infiniteRef.current = infinite
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

  /** Giữa khung: chỉ mũi tên / preview tin (không gồm đang nhập — đang nhập ở góc dưới trái). */
  const floatingCenterUi = useMemo(() => {
    if (
      lastMsg &&
      anchorAtBottomId !== null &&
      lastMsg.id !== anchorAtBottomId &&
      !isNearBottom
    ) {
      const name = displayNameForMessageSender(lastMsg.sender, room?.participants)
      const prev = (lastMsg.content ?? '').trim().slice(0, 48) || '…'
      return { kind: 'text' as const, text: `${name}: ${prev}` }
    }
    if (!isNearBottom) return { kind: 'arrow' as const, text: '' }
    return null
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
      <header className="flex shrink-0 flex-col border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/15 text-sm font-medium text-primary">
                {title.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-foreground">{title}</h2>
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
            <Button type="button" variant="ghost" size="icon" disabled title="Sắp có">
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled title="Sắp có">
              <Video className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled title="Sắp có">
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleRightPanel}
              title="Thông tin hội thoại"
              className={cn(rightPanelOpen && 'bg-accent')}
            >
              <PanelRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="relative h-full min-h-0 scroll-auto overflow-y-auto bg-stone-100/90 px-4 py-3 dark:bg-stone-900/20"
        >
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
            <div
              key={conversationId}
              className={cn(
                initialRevealDone &&
                skelPhase === 'hidden' &&
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-450 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]'
              )}
            >
              {groups.map((g) => (
                <div key={g.dayKey} className="mb-4">
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                      {formatDaySeparator(g.items[0].createdAt)}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {g.items.map((m) => {
                      const mine = m.sender.id === currentUserId
                      const senderLabel = displayNameForMessageSender(m.sender, room?.participants)
                      return (
                        <li
                          key={m.id}
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
                            className="group/msg relative inline-block max-w-[min(100%,28rem)] pb-4"
                            onMouseLeave={(e) => {
                              const next = e.relatedTarget as Node | null
                              if (next && e.currentTarget.contains(next)) return
                              setReactionShellLeaveByMessageId((prev) => ({
                                ...prev,
                                [m.id]: (prev[m.id] ?? 0) + 1,
                              }))
                            }}
                          >
                            <div
                              className={cn(
                                'rounded-2xl px-3 py-2 text-sm shadow-sm',
                                mine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border bg-white text-foreground'
                              )}
                            >
                              {!mine ? (
                                <p className="mb-1 text-xs text-muted-foreground">{senderLabel}</p>
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
                              <p
                                className={cn(
                                  'mt-1 text-[10px]',
                                  mine ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                )}
                              >
                                {formatMessageTime(m.createdAt)}
                              </p>
                            </div>
                            <MessageReactionHoverLayer
                              message={m}
                              conversationId={conversationId}
                              mine={mine}
                              shellLeaveSignal={reactionShellLeaveByMessageId[m.id] ?? 0}
                            />
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
                'pointer-events-none absolute inset-0 z-10 flex flex-col bg-stone-100/90 px-4 py-3 backdrop-blur-[2px] transition-opacity duration-300 ease-out dark:bg-stone-900/35',
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
                    style={{ animationDelay: `${(i - 1) * 45}ms` }}
                    className={cn(
                      'flex gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500',
                      i % 2 === 0 ? 'flex-row-reverse' : ''
                    )}
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
            <span className="inline-block max-w-full truncate rounded border border-border bg-white/95 px-1.5 py-0.5 text-[11px] leading-snug text-muted-foreground shadow-sm backdrop-blur-sm transition-shadow duration-200">
              {typingLine}
            </span>
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
                <ChevronDown className="h-5 w-5 shrink-0 text-primary" aria-hidden />
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
        conversationId={conversationId}
        socket={socket}
        connected={connected}
        currentUserId={currentUserId}
        roomTitle={title}
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

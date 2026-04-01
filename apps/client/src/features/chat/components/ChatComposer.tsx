import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { Image, Paperclip, Smile, ThumbsUp, X } from 'lucide-react'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import {
  createMessage,
  normalizeMessagePayload,
  uploadMessageImages,
} from '@/features/messages/api/messages.api'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { messagesInfiniteKeys } from '@/features/messages/queries/useRoomMessagesInfinite'
import { emitTypingStart, emitTypingStop } from '@/features/sockets/typingPresenceSocket'
import { fetchUploadConfig } from '@/features/config/uploadConfig.api'
import { compressImageIfNeeded } from '@/lib/imageCompress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { usePendingImageUploadsStore } from '@/features/messages/store/pendingImageUploads.store'

export type ChatComposerHandle = {
  focus: () => void
}

type ChatComposerProps = {
  conversationId: string
  socket: Socket | null
  connected: boolean
  currentUserId: string | undefined
  roomTitle: string
  replyingTo: MessageItemDto | null
  onReplyingToChange: (next: MessageItemDto | null) => void
  onAfterSend?: () => void
}

type PendingImg = { key: string; file: File; url: string }

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    {
      conversationId,
      socket,
      connected,
      currentUserId,
      roomTitle,
      replyingTo,
      onReplyingToChange,
      onAfterSend,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }))

    const [text, setText] = useState('')
    const [pending, setPending] = useState<PendingImg[]>([])
    const [uploadError, setUploadError] = useState<{
      messageId: string
      files: File[]
    } | null>(null)
    const [retryBusy, setRetryBusy] = useState(false)
    const queryClient = useQueryClient()
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadCfgRef = useRef<Awaited<ReturnType<typeof fetchUploadConfig>> | null>(null)
    const pendingRef = useRef<PendingImg[]>([])
    pendingRef.current = pending
    const registerPendingUploads = usePendingImageUploadsStore((s) => s.register)

    useEffect(() => {
      void fetchUploadConfig().then((c) => {
        uploadCfgRef.current = c
      })
    }, [])

    useEffect(() => {
      return () => {
        for (const p of pendingRef.current) {
          URL.revokeObjectURL(p.url)
        }
      }
    }, [])

    useEffect(() => {
      setPending((prev) => {
        for (const p of prev) URL.revokeObjectURL(p.url)
        return []
      })
      setUploadError(null)
      onReplyingToChange(null)
      // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset khi đổi room; setReplyingTo ổn định
    }, [conversationId])

    useEffect(() => {
      if (!socket || !connected || !currentUserId) return
      if (typingTimer.current) clearTimeout(typingTimer.current)
      const t = text.trim()
      if (t.length > 0) {
        emitTypingStart(socket, conversationId)
        typingTimer.current = setTimeout(() => emitTypingStop(socket, conversationId), 2000)
      } else {
        emitTypingStop(socket, conversationId)
      }
      return () => {
        if (typingTimer.current) clearTimeout(typingTimer.current)
      }
    }, [text, socket, connected, conversationId, currentUserId])

    const onPickFiles = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files
        if (!list?.length) return
        const cfg = uploadCfgRef.current ?? (await fetchUploadConfig())
        uploadCfgRef.current = cfg
        const maxN = cfg.maxImagesPerMessage
        const maxBytes = cfg.maxImageBytesPerFile
        const next: PendingImg[] = [...pending]
        for (const f of Array.from(list)) {
          if (!f.type.startsWith('image/')) continue
          if (f.size > maxBytes) continue
          if (next.length >= maxN) break
          let file = f
          if (cfg.clientCompressRecommended) {
            file = await compressImageIfNeeded(f, cfg.maxImageDimensionPx)
          }
          const url = URL.createObjectURL(file)
          next.push({ key: `${file.name}-${Date.now()}-${Math.random()}`, file, url })
        }
        setPending(next)
        e.target.value = ''
      },
      [pending]
    )

    const removePending = useCallback((key: string) => {
      setPending((prev) => {
        const p = prev.find((x) => x.key === key)
        if (p) URL.revokeObjectURL(p.url)
        return prev.filter((x) => x.key !== key)
      })
    }, [])

    const send = () => {
      const c = text.trim()
      const files = pending.map((p) => p.file)
      if (!c && files.length === 0) return

      const previewUrlsSnapshot = pending.map((p) => p.url)
      const filesSnapshot = [...files]
      const textSnapshot = c
      const replySnapshot = replyingTo

      const body = {
        ...(c ? { content: c } : {}),
        ...(filesSnapshot.length > 0 ? { plannedImageCount: filesSnapshot.length } : {}),
        ...(replySnapshot ? { parentMessageId: replySnapshot.id } : {}),
      }

      setUploadError(null)
      emitTypingStop(socket, conversationId)

      // Composer gọn ngay — không khóa ô nhập trong lúc chờ mạng / upload
      setText('')
      onReplyingToChange(null)
      setPending([])

      void (async () => {
        try {
          let message: MessageItemDto

          if (socket && connected) {
            try {
              message = await new Promise<MessageItemDto>((resolve, reject) => {
                const t = setTimeout(() => reject(new Error('timeout')), 12000)
                socket.emit(
                  SOCKET_EVENTS.CHAT_SEND,
                  { conversationId, ...body },
                  (ack: unknown) => {
                    clearTimeout(t)
                    const a = ack as { ok?: boolean; message?: MessageItemDto }
                    if (a?.ok && a.message) {
                      resolve(normalizeMessagePayload(a.message))
                    } else {
                      reject(new Error('ack'))
                    }
                  }
                )
              })
            } catch {
              message = await createMessage(conversationId, body)
            }
          } else {
            message = await createMessage(conversationId, body)
          }

          await queryClient.invalidateQueries({
            queryKey: messagesInfiniteKeys.room(conversationId),
          })
          onAfterSend?.()

          if (filesSnapshot.length > 0) {
            registerPendingUploads(message.id, previewUrlsSnapshot)
            try {
              await uploadMessageImages(message.id, filesSnapshot)
              await queryClient.invalidateQueries({
                queryKey: messagesInfiniteKeys.room(conversationId),
              })
            } catch {
              setUploadError({ messageId: message.id, files: filesSnapshot })
            }
          }
        } catch {
          setText(textSnapshot)
          onReplyingToChange(replySnapshot)
          if (filesSnapshot.length > 0) {
            setPending(
              filesSnapshot.map((file, i) => ({
                key: `restore-${Date.now()}-${i}`,
                file,
                url: URL.createObjectURL(file),
              }))
            )
          }
        } finally {
          requestAnimationFrame(() => inputRef.current?.focus())
        }
      })()
    }

    const retryUpload = async () => {
      if (!uploadError) return
      setRetryBusy(true)
      try {
        await uploadMessageImages(uploadError.messageId, uploadError.files)
        setUploadError(null)
        await queryClient.invalidateQueries({
          queryKey: messagesInfiniteKeys.room(conversationId),
        })
        requestAnimationFrame(() => inputRef.current?.focus())
      } catch {
        /* giữ uploadError */
      } finally {
        setRetryBusy(false)
      }
    }

    return (
      <TooltipProvider delayDuration={300}>
        <div className="relative shrink-0 border-t border-border/60 bg-white px-3 py-2">
          {replyingTo ? (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs">
              <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
                <p className="font-medium text-foreground">
                  {replyingTo.sender.displayName?.trim() || replyingTo.sender.username}
                </p>
                <p className="line-clamp-2 text-muted-foreground">
                  {(replyingTo.content ?? '').trim().slice(0, 160) ||
                    (replyingTo.attachments?.length || replyingTo.fileUrl ? 'Ảnh' : '…')}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onReplyingToChange(null)}
                aria-label="Bỏ trả lời"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {uploadError ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
              <span>Ảnh chưa tải lên được. Tin văn bản đã gửi.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={retryBusy}
                onClick={() => void retryUpload()}
              >
                Thử lại upload
              </Button>
            </div>
          ) : null}

          {pending.length > 0 ? (
            <div className="pointer-events-none absolute bottom-full left-3 right-3 z-30 mb-1 flex max-h-[min(40vh,220px)] flex-wrap justify-end gap-2 overflow-y-auto pb-1">
              {pending.map((p) => (
                <div
                  key={p.key}
                  className="pointer-events-auto relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-md"
                >
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 cursor-pointer rounded-full bg-background/90 p-0.5 shadow"
                    onClick={() => removePending(p.key)}
                    aria-label="Bỏ ảnh"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-1.5">
            <div className="flex shrink-0 items-center gap-0.5 pb-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ảnh (giới hạn theo server)</TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => void onPickFiles(e)}
              />
              {[Smile, Paperclip].map((Icon, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sắp có</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Nhập @, tin nhắn tới ${roomTitle}`}
              className="min-h-10 flex-1 rounded-full border-border/80 bg-[#f4f5f7] px-4 shadow-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <div className="flex shrink-0 items-center gap-1 pb-0.5">
              {text.trim() || pending.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        'h-9 shrink-0 rounded-full bg-[#0068ff] px-4 text-white hover:bg-[#0056d6]'
                      )}
                      disabled={!text.trim() && pending.length === 0}
                      onClick={() => void send()}
                    >
                      Gửi
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Gửi tin nhắn (Enter)</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" disabled className="h-9 w-9 shrink-0">
                      <ThumbsUp className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sắp có</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }
)

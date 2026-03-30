import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { Image, Loader2, Paperclip, Smile, ThumbsUp, X } from 'lucide-react'
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

type ChatComposerProps = {
  conversationId: string
  socket: Socket | null
  connected: boolean
  currentUserId: string | undefined
  roomTitle: string
  onAfterSend?: () => void
}

type PendingImg = { key: string; file: File; url: string }

export function ChatComposer({
  conversationId,
  socket,
  connected,
  currentUserId,
  roomTitle,
  onAfterSend,
}: ChatComposerProps) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState<PendingImg[]>([])
  const [uploadError, setUploadError] = useState<{
    messageId: string
    files: File[]
  } | null>(null)
  const [sending, setSending] = useState(false)
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

  const send = async () => {
    const c = text.trim()
    const files = pending.map((p) => p.file)
    if (!c && files.length === 0) return

    setSending(true)
    setUploadError(null)
    emitTypingStop(socket, conversationId)

    const body = {
      ...(c ? { content: c } : {}),
      ...(files.length > 0 ? { plannedImageCount: files.length } : {}),
    }

    const filesSnapshot = [...files]

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

      setText('')
      if (filesSnapshot.length > 0) {
        const previewUrls = pending.map((p) => p.url)
        registerPendingUploads(message.id, previewUrls)
      }
      setPending([])

      await queryClient.invalidateQueries({
        queryKey: messagesInfiniteKeys.room(conversationId),
      })
      onAfterSend?.()

      if (filesSnapshot.length > 0) {
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
      /* lỗi tạo tin */
    } finally {
      setSending(false)
    }
  }

  const retryUpload = async () => {
    if (!uploadError) return
    setSending(true)
    try {
      await uploadMessageImages(uploadError.messageId, uploadError.files)
      setUploadError(null)
      await queryClient.invalidateQueries({
        queryKey: messagesInfiniteKeys.room(conversationId),
      })
    } catch {
      /* giữ uploadError */
    } finally {
      setSending(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative shrink-0 border-t border-border bg-white px-3 py-2 dark:bg-background">
        {uploadError ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
            <span>Ảnh chưa tải lên được. Tin văn bản đã gửi.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={sending}
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
                {sending ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                  onClick={() => removePending(p.key)}
                  disabled={sending}
                  aria-label="Bỏ ảnh"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mb-2 flex flex-wrap gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={sending}
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
        <div className="flex items-end gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Nhập @, tin nhắn tới ${roomTitle}`}
            className="min-h-10 flex-1 border-border bg-muted/30"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className={cn('shrink-0', sending && 'opacity-70')}
                disabled={sending || (!text.trim() && pending.length === 0)}
                onClick={() => void send()}
              >
                Gửi
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gửi tin nhắn (Enter)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" disabled className="shrink-0">
                <ThumbsUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sắp có</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

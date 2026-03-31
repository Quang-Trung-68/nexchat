import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ALLOWED_REACTION_EMOJIS, EMOJI_ANGRY_FACE } from '@chat-app/shared-constants'
import { Plus, ThumbsUp } from 'lucide-react'
import { postMessageReaction } from '@/features/messages/api/messages.api'
import { applyReactionPatch } from '@/features/messages/reactions/applyReactionPatch'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { cn } from '@/lib/utils'

const LEAVE_EXPAND_MS = 320

/** Menu ngang: like, heart, haha, wow, huhu, angry, + mở rộng. */
const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Huhu' },
  { emoji: EMOJI_ANGRY_FACE, label: 'Angry' },
] as const

type MessageReactionsProps = {
  message: MessageItemDto
  conversationId: string
  mine: boolean
}

function useReactionApply(message: MessageItemDto, conversationId: string) {
  const queryClient = useQueryClient()
  return useCallback(
    async (emoji: string) => {
      const prev: Pick<MessageItemDto, 'reactionSummary' | 'myReactionEmoji'> = {
        reactionSummary: message.reactionSummary ?? [],
        myReactionEmoji: message.myReactionEmoji ?? null,
      }
      try {
        const data = await postMessageReaction(message.id, emoji)
        applyReactionPatch(queryClient, conversationId, message.id, {
          reactionSummary: data.reactionSummary,
          myReactionEmoji: data.myReactionEmoji,
        })
      } catch {
        applyReactionPatch(queryClient, conversationId, message.id, prev)
      }
    },
    [conversationId, message.id, message.myReactionEmoji, message.reactionSummary, queryClient]
  )
}

type HoverLayerProps = MessageReactionsProps & {
  shellLeaveSignal?: number
}

/**
 * Dưới mép bubble: pill tối (demo) + nút tròn trắng; menu neo sát nút để không mất hover.
 */
export function MessageReactionHoverLayer({
  message,
  conversationId,
  mine,
  shellLeaveSignal = 0,
}: HoverLayerProps) {
  const apply = useReactionApply(message, conversationId)
  const [expanded, setExpanded] = useState(false)
  const [menusDismissed, setMenusDismissed] = useState(false)
  const collapseExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const summary = message.reactionSummary ?? []
  const myEmoji = message.myReactionEmoji ?? null
  const totalReactions = summary.reduce((acc, s) => acc + s.count, 0)
  const previewTypes = summary.slice(0, 3)
  const hasReactions = summary.length > 0

  useEffect(() => {
    setExpanded(false)
    setMenusDismissed(false)
  }, [shellLeaveSignal])

  const clearExpandTimer = () => {
    if (collapseExpandTimer.current) {
      clearTimeout(collapseExpandTimer.current)
      collapseExpandTimer.current = null
    }
  }

  useEffect(() => () => clearExpandTimer(), [])

  const onPick = (emoji: string) => {
    setMenusDismissed(true)
    setExpanded(false)
    void apply(emoji)
  }

  /** Neo menu theo cạnh bubble: tin người khác → trái; tin mình → phải. */
  const edge = mine ? 'right-0' : 'left-0'
  const menuAnchor = mine ? 'right-0' : 'left-0'

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-0 z-30 flex translate-y-0.5 flex-row items-end gap-1',
        edge
      )}
    >
      {hasReactions ? (
        <div
          className="pointer-events-auto flex max-w-[min(100%,12rem)] items-center rounded-full border border-zinc-700/80 bg-[#1c1c1e] px-1.5 py-0.5 shadow-sm dark:border-zinc-600"
        >
          <div className="flex items-center">
            {previewTypes.map((s, i) => (
              <span
                key={s.emoji}
                className={cn(
                  'inline-flex h-5 w-5 select-none items-center justify-center rounded-full border border-zinc-600/90 bg-zinc-800 text-sm leading-none text-zinc-100',
                  i > 0 && '-ml-1.5'
                )}
                aria-hidden
              >
                {s.emoji}
              </span>
            ))}
          </div>
          {totalReactions > 1 ? (
            <span className="ml-1 min-w-[1ch] text-xs font-medium tabular-nums text-white">
              {totalReactions}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'flex flex-col',
          mine ? 'items-end' : 'items-start',
          !hasReactions &&
          'pointer-events-none opacity-0 transition-opacity duration-150 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100',
          hasReactions && 'pointer-events-auto opacity-100'
        )}
      >
        <div
          className={cn('group/plus relative', mine ? 'flex flex-col items-end' : 'flex flex-col items-start')}
          onMouseEnter={() => clearExpandTimer()}
          onMouseLeave={() => {
            clearExpandTimer()
            collapseExpandTimer.current = setTimeout(() => setExpanded(false), LEAVE_EXPAND_MS)
          }}
        >
          {/* translate-y-1.5: menu chồng nhẹ lên vùng nút — chuột không rơi khe giữa */}
          {!menusDismissed && !expanded ? (
            <div
              className={cn(
                'pointer-events-none absolute bottom-full z-40 mb-0 flex translate-y-1.5 flex-row items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 py-0.5 opacity-0 shadow-md transition-opacity duration-100 group-hover/plus:pointer-events-auto group-hover/plus:opacity-100 dark:border-zinc-600 dark:bg-zinc-900',
                menuAnchor
              )}
            >
              {QUICK_REACTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[15px] leading-none transition-transform duration-150 hover:scale-110 hover:bg-accent"
                  onClick={() => onPick(item.emoji)}
                >
                  {item.emoji}
                </button>
              ))}
              <button
                type="button"
                title="Thêm emoji"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-transform duration-150 hover:scale-110 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  clearExpandTimer()
                  setExpanded(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          ) : null}
          {expanded && !menusDismissed ? (
            <div
              className={cn(
                'pointer-events-auto absolute bottom-full z-40 mb-0 max-h-[min(50vh,280px)] w-[min(90vw,200px)] translate-y-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-600 dark:bg-zinc-900',
                menuAnchor
              )}
            >
              <div className="grid max-h-[min(44vh,260px)] grid-cols-5 gap-px overflow-y-auto p-1">
                {ALLOWED_REACTION_EMOJIS.map((e, idx) => (
                  <button
                    key={`${idx}-${e}`}
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded text-[15px] leading-none transition-transform duration-150 hover:scale-105 hover:bg-accent"
                    onClick={() => onPick(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={cn(
              'pointer-events-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white shadow-sm transition-colors dark:border-zinc-500 dark:bg-zinc-100',
              mine ? 'hover:bg-zinc-50 dark:hover:bg-white' : 'hover:bg-zinc-50 dark:hover:bg-white'
            )}
            aria-label="Reaction"
          >
            {myEmoji ? (
              <span className="text-[15px] leading-none">{myEmoji}</span>
            ) : (
              <ThumbsUp className="h-3 w-3 text-zinc-400" strokeWidth={2.25} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

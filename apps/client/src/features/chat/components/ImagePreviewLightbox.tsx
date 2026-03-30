import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ImagePreviewLightboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  urls: string[]
  /** Index ban đầu khi mở */
  startIndex: number
}

export function ImagePreviewLightbox({
  open,
  onOpenChange,
  urls,
  startIndex,
}: ImagePreviewLightboxProps) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, startIndex), Math.max(0, urls.length - 1)))
    }
  }, [open, startIndex, urls.length])

  const n = urls.length
  const current = urls[index] ?? ''

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? n - 1 : i - 1))
  }, [n])

  const goNext = useCallback(() => {
    setIndex((i) => (i >= n - 1 ? 0 : i + 1))
  }, [n])

  useEffect(() => {
    if (!open || n <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, n, goPrev, goNext])

  if (n === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-[min(100vw,56rem)] gap-0 border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">
          Xem ảnh {index + 1} / {n}
        </DialogTitle>
        <div className="relative flex max-h-[90vh] items-center justify-center rounded-xl bg-black/90 p-2">
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
            onClick={() => onOpenChange(false)}
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          {n > 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-12 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                aria-label="Ảnh sau"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          ) : null}

          <img
            src={current}
            alt=""
            className={cn(
              'max-h-[min(85vh,calc(100vw-4rem))] w-auto max-w-full object-contain',
              'select-none'
            )}
            draggable={false}
          />

          {n > 1 ? (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
              {index + 1} / {n}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

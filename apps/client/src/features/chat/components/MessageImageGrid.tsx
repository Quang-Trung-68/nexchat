import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type MessageImageGridProps = {
  urls: string[]
  /** Tổng ảnh (overlay +N); mặc định = urls.length */
  totalCount?: number
  loading?: boolean
  onPhotoClick: (index: number) => void
  className?: string
}

/**
 * Bố cục nhóm ảnh: 1 full; 2 cột; 3 trái lớn + phải 2; 4 → 2×2; 5 → 2/3+1/3 + hàng 3; 6+ → 3×2, ô 6 là +N
 */
export function MessageImageGrid({
  urls,
  totalCount,
  loading,
  onPhotoClick,
  className,
}: MessageImageGridProps) {
  const n = urls.length
  const total = totalCount ?? n
  if (n === 0 && !loading) return null

  const Cell = ({
    url,
    index,
    className: cellClass,
    overlay,
    cellLoading,
  }: {
    url?: string
    index: number
    className?: string
    overlay?: ReactNode
    cellLoading?: boolean
  }) => {
    const showLoader = cellLoading && Boolean(url)
    return (
      <button
        type="button"
        className={cn(
          'relative min-h-0 overflow-hidden bg-muted outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring',
          cellClass
        )}
        onClick={() => onPhotoClick(index)}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : null}
        {overlay}
        {showLoader ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
          </div>
        ) : null}
      </button>
    )
  }

  if (total >= 6) {
    const show = urls.slice(0, 5)
    const extra = total - 5
    return (
      <div className={cn('grid grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-xl', className)}>
        {show.map((url, i) => (
          <Cell key={i} url={url} index={i} className="aspect-square" cellLoading={loading} />
        ))}
        <button
          type="button"
          className="relative flex aspect-square items-center justify-center overflow-hidden bg-black/75 text-xl font-semibold text-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onPhotoClick(5)}
        >
          <span className="relative z-10">+{extra}</span>
        </button>
      </div>
    )
  }

  if (n === 1) {
    return (
      <div className={cn('overflow-hidden rounded-xl', className)}>
        <Cell url={urls[0]} index={0} className="max-h-72 w-full min-h-[120px]" cellLoading={loading} />
      </div>
    )
  }

  if (n === 2) {
    return (
      <div className={cn('grid grid-cols-2 gap-1 overflow-hidden rounded-xl', className)}>
        <Cell url={urls[0]} index={0} className="aspect-[3/4] min-h-[120px]" cellLoading={loading} />
        <Cell url={urls[1]} index={1} className="aspect-[3/4] min-h-[120px]" cellLoading={loading} />
      </div>
    )
  }

  if (n === 3) {
    return (
      <div
        className={cn(
          'grid gap-1 overflow-hidden rounded-xl [grid-template-columns:1fr_1fr] [grid-template-rows:1fr_1fr]',
          className
        )}
      >
        <Cell url={urls[0]} index={0} className="row-span-2 min-h-[140px]" cellLoading={loading} />
        <Cell url={urls[1]} index={1} className="min-h-[68px]" cellLoading={loading} />
        <Cell url={urls[2]} index={2} className="min-h-[68px]" cellLoading={loading} />
      </div>
    )
  }

  if (n === 4) {
    return (
      <div className={cn('grid grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl', className)}>
        {urls.map((url, i) => (
          <Cell key={i} url={url} index={i} className="aspect-square min-h-[100px]" cellLoading={loading} />
        ))}
      </div>
    )
  }

  if (n === 5) {
    return (
      <div className={cn('flex flex-col gap-1 overflow-hidden rounded-xl', className)}>
        <div className="grid grid-cols-6 gap-1">
          <Cell url={urls[0]} index={0} className="col-span-4 aspect-[2/1] min-h-[100px]" cellLoading={loading} />
          <Cell url={urls[1]} index={1} className="col-span-2 aspect-square min-h-[100px]" cellLoading={loading} />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Cell url={urls[2]} index={2} className="aspect-square min-h-[88px]" cellLoading={loading} />
          <Cell url={urls[3]} index={3} className="aspect-square min-h-[88px]" cellLoading={loading} />
          <Cell url={urls[4]} index={4} className="aspect-square min-h-[88px]" cellLoading={loading} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-32 items-center justify-center rounded-xl bg-muted', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

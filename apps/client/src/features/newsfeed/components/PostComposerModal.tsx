import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createPost } from '../api/posts.api'

type PostComposerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostComposerModal({ open, onOpenChange }: PostComposerModalProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => createPost(text.trim(), files),
    onSuccess: () => {
      setText('')
      setFiles([])
      previews.forEach((u) => URL.revokeObjectURL(u))
      setPreviews([])
      onOpenChange(false)
      void qc.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    },
  })

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next = [...files, ...Array.from(list)]
    setFiles(next)
    const urls = next.map((f) => URL.createObjectURL(f))
    previews.forEach((u) => URL.revokeObjectURL(u))
    setPreviews(urls)
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]!)
    const nextFiles = files.filter((_, i) => i !== index)
    const nextPreviews = previews.filter((_, i) => i !== index)
    setFiles(nextFiles)
    setPreviews(nextPreviews)
  }

  const handleClose = (next: boolean) => {
    if (!next && !mutation.isPending) {
      previews.forEach((u) => URL.revokeObjectURL(u))
      setFiles([])
      setPreviews([])
      setText('')
    }
    onOpenChange(next)
  }

  const canSubmit = (text.trim().length > 0 || files.length > 0) && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo nhật ký</DialogTitle>
        </DialogHeader>
        <textarea
          placeholder="Chia sẻ điều bạn đang nghĩ…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={5000}
          className={cn(
            'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'resize-none'
          )}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  onClick={() => removeFile(i)}
                  aria-label="Xóa ảnh"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">Không đăng được. Thử lại sau.</p>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Ảnh
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng…
                </>
              ) : (
                'Đăng'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

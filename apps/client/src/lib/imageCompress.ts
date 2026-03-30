/**
 * Thu nhỏ cạnh dài nếu vượt `maxDimension` (JPEG ~0.92) — giảm băng thông trước multipart.
 * Ảnh nhỏ hơn ngưỡng trả về file gốc.
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension: number
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file

  const { width, height } = bmp
  const maxSide = Math.max(width, height)
  if (maxSide <= maxDimension) {
    bmp.close()
    return file
  }

  const scale = maxDimension / maxSide
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bmp.close()
    return file
  }
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  )
  if (!blob) return file

  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}

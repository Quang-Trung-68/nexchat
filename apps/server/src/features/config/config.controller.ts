import type { Request, Response } from 'express'
import { getUploadConfig } from '@/config/upload.config'

/** Giới hạn upload cho client (validate trước khi gửi) — khớp mặc định env. */
export function getUploadConfigPublic(_req: Request, res: Response) {
  const c = getUploadConfig()
  res.json({
    success: true,
    data: {
      maxImagesPerMessage: c.maxImagesPerMessage,
      maxImageBytesPerFile: c.maxImageBytesPerFile,
      maxImageDimensionPx: c.maxImageDimensionPx,
      /** Client có thể nén theo cạnh dài tối đa này trước khi multipart. */
      clientCompressRecommended: true,
    },
  })
}

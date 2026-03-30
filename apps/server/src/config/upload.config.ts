import { UPLOAD_DEFAULTS } from '@chat-app/shared-constants'

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Đọc từ env; mặc định từ `UPLOAD_DEFAULTS` (không hardcode số trong logic nghiệp vụ). */
export function getUploadConfig() {
  return {
    maxImagesPerMessage: parsePositiveInt(
      process.env.UPLOAD_MAX_IMAGES_PER_MESSAGE,
      UPLOAD_DEFAULTS.MAX_IMAGES_PER_MESSAGE
    ),
    maxImageBytesPerFile: parsePositiveInt(
      process.env.UPLOAD_MAX_IMAGE_BYTES_PER_FILE,
      UPLOAD_DEFAULTS.MAX_IMAGE_BYTES_PER_FILE
    ),
    maxImageDimensionPx: parsePositiveInt(
      process.env.UPLOAD_MAX_IMAGE_DIMENSION_PX,
      UPLOAD_DEFAULTS.MAX_IMAGE_DIMENSION_PX
    ),
  }
}

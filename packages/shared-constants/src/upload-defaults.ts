/** Giá trị mặc định — override bằng biến môi trường trên server / GET /api/config/upload cho client. */
export const UPLOAD_DEFAULTS = {
  MAX_IMAGES_PER_MESSAGE: 10,
  MAX_IMAGE_BYTES_PER_FILE: 5 * 1024 * 1024,
  /** Cạnh dài tối đa sau khi nén phía client (px) — giảm băng thông, không thay thế giới hạn server. */
  MAX_IMAGE_DIMENSION_PX: 1920,
} as const

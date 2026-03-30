import { api } from '@/services/api'
import { UPLOAD_DEFAULTS } from '@chat-app/shared-constants'

export type ClientUploadConfig = {
  maxImagesPerMessage: number
  maxImageBytesPerFile: number
  maxImageDimensionPx: number
  clientCompressRecommended: boolean
}

export async function fetchUploadConfig(): Promise<ClientUploadConfig> {
  try {
    const { data } = await api.get<{ success: boolean; data: ClientUploadConfig }>(
      '/config/upload'
    )
    return data.data
  } catch {
    return {
      maxImagesPerMessage: UPLOAD_DEFAULTS.MAX_IMAGES_PER_MESSAGE,
      maxImageBytesPerFile: UPLOAD_DEFAULTS.MAX_IMAGE_BYTES_PER_FILE,
      maxImageDimensionPx: UPLOAD_DEFAULTS.MAX_IMAGE_DIMENSION_PX,
      clientCompressRecommended: true,
    }
  }
}

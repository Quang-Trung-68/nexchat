import { v2 as cloudinary } from 'cloudinary'
import { env } from '@/config/env'

let configured = false

export function ensureCloudinaryConfigured(): boolean {
  if (configured) return true
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
  configured = true
  return true
}

export async function uploadImageBufferToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<string> {
  if (!ensureCloudinaryConfigured()) {
    throw new Error('Cloudinary chưa cấu hình')
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', overwrite: false },
      (err, result) => {
        if (err) {
          reject(err)
          return
        }
        if (!result?.secure_url) {
          reject(new Error('Cloudinary không trả URL'))
          return
        }
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

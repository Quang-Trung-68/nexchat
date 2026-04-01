import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

/** concurrently / npm workspaces đôi khi để cwd ở gốc repo — vẫn load được apps/server/.env */
function loadServerEnv(): void {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, 'apps', 'server', '.env'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p })
      return
    }
  }
  dotenv.config()
}
loadServerEnv()

/** Tránh `localhost` → ::1 trong khi Redis thường chỉ bind IPv4 (127.0.0.1), khiến ioredis không ping được. */
function redisUrlPreferIpv4Loopback(url: string): string {
  const nodeEnv = process.env.NODE_ENV || 'development'
  if (nodeEnv === 'production') return url
  try {
    const u = new URL(url)
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1'
      return u.toString()
    }
  } catch {
    /* giữ nguyên nếu URL không chuẩn */
  }
  return url
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  /** Nginx / reverse proxy — `req.ip` và rate limit theo client thật. */
  TRUST_PROXY:
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY === 'true' ||
    process.env.NODE_ENV === 'production',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: redisUrlPreferIpv4Loopback(process.env.REDIS_URL || 'redis://127.0.0.1:6379'),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  GITHUB_CALLBACK_URL:
    process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Chat App <noreply@chatapp.com>',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  /** Web Push (VAPID). Thiếu → không enqueue job push / worker bỏ qua gửi. */
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  /** `mailto:you@example.com` hoặc URL trang chủ (chuẩn web-push). */
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:noreply@localhost',
}

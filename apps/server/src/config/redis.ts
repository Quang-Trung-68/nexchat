import Redis from 'ioredis'
import { env } from '@/config/env'

/** Redis cho typing/presence (SETEX, INCR/DECR). */
let cacheRedis: Redis | null = null
/** Pub/sub cho `@socket.io/redis-adapter` — không dùng cho lệnh thường. */
let pubClient: Redis | null = null
let subClient: Redis | null = null

/** Fallback in-memory khi Redis không chạy (chỉ dev). */
let memoryCache: InMemoryRedisLike | null = null

/** `true` khi đã kết nối Redis thật (ping OK). */
export let redisAdapterEnabled = false

function attachQuietErrorHandler(client: Redis, label: string) {
  client.on('error', (err: Error) => {
    if (env.NODE_ENV === 'development') {
      console.warn(`[Redis ${label}]`, err.message)
    }
  })
}

/** Tối thiểu API typing/presence (Promise). */
export type RedisCacheLike = {
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  del(...keys: string[]): Promise<number>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
}

class InMemoryRedisLike implements RedisCacheLike {
  private strings = new Map<string, string>()
  private counters = new Map<string, number>()
  private ttlTimers = new Map<string, ReturnType<typeof setTimeout>>()

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const prev = this.ttlTimers.get(key)
    if (prev) clearTimeout(prev)
    this.strings.set(key, value)
    const t = setTimeout(() => {
      this.strings.delete(key)
      this.ttlTimers.delete(key)
    }, seconds * 1000)
    this.ttlTimers.set(key, t)
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0
    for (const key of keys) {
      const timer = this.ttlTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.ttlTimers.delete(key)
      }
      if (this.strings.delete(key) || this.counters.has(key)) {
        this.counters.delete(key)
        n++
      }
    }
    return n
  }

  async incr(key: string): Promise<number> {
    const next = (this.counters.get(key) ?? 0) + 1
    this.counters.set(key, next)
    return next
  }

  async decr(key: string): Promise<number> {
    const next = (this.counters.get(key) ?? 0) - 1
    if (next <= 0) {
      this.counters.delete(key)
      return next
    }
    this.counters.set(key, next)
    return next
  }
}

const redisOptions = {
  maxRetriesPerRequest: null as null,
  enableOfflineQueue: false,
  /** Bắt buộc: chờ `connect()` rồi mới ping — nếu false, ping() lúc stream chưa sẵn sàng → "Stream isn't writeable" */
  lazyConnect: true,
  retryStrategy: () => null,
  /** Dev: tránh kết nối qua ::1 khi Redis chỉ bind IPv4 */
  ...(env.NODE_ENV === 'development' ? { family: 4 as const } : {}),
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Một lần tạo client + ping; thất bại thì dọn sạch. */
async function tryConnectRedisOnce(): Promise<boolean> {
  const clients: Redis[] = []
  try {
    cacheRedis = new Redis(env.REDIS_URL, redisOptions)
    pubClient = new Redis(env.REDIS_URL, redisOptions)
    subClient = pubClient.duplicate()
    clients.push(cacheRedis, pubClient, subClient)

    for (const c of clients) {
      attachQuietErrorHandler(c, 'client')
    }

    await Promise.all([cacheRedis.connect(), pubClient.connect(), subClient.connect()])
    await Promise.all([cacheRedis.ping(), pubClient.ping(), subClient.ping()])
    redisAdapterEnabled = true
    return true
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Redis] ping thất bại —', msg)
    }
    redisAdapterEnabled = false
    for (const c of clients) {
      try {
        c.disconnect()
      } catch {
        /* ignore */
      }
    }
    cacheRedis = null
    pubClient = null
    subClient = null
    return false
  }
}

/**
 * Kết nối Redis (adapter + typing/presence).
 * **Development:** thử lại vài lần (redis chạy song song với `npm run dev`).
 * Khi vẫn không ping được: bộ nhớ trong, không thoát process.
 */
export async function initRedis(): Promise<'redis' | 'memory'> {
  if (cacheRedis && redisAdapterEnabled) return 'redis'
  if (memoryCache) return 'memory'

  const maxAttempts = env.NODE_ENV === 'development' ? 24 : 1
  const delayMs = 200

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ok = await tryConnectRedisOnce()
    if (ok) return 'redis'
    if (attempt === 0 && env.NODE_ENV === 'development') {
      console.log('[Server] Chờ Redis (khởi động cùng lúc với redis-server trong npm run dev)…')
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs)
    }
  }

  if (env.NODE_ENV !== 'development') {
    throw new Error('Redis không khả dụng — kiểm tra REDIS_URL và Redis đang chạy.')
  }

  console.warn(
    '[Server] Không kết nối được Redis — chạy dev không Redis (Socket.IO không dùng redis-adapter; typing/presence trong RAM).'
  )
  memoryCache = new InMemoryRedisLike()
  return 'memory'
}

export function getRedisCache(): Redis | RedisCacheLike {
  if (memoryCache) return memoryCache
  if (!cacheRedis) {
    throw new Error('Redis chưa được khởi tạo — gọi initRedis() trước')
  }
  return cacheRedis
}

export function getRedisAdapterClients(): { pubClient: Redis; subClient: Redis } {
  if (!redisAdapterEnabled || !pubClient || !subClient) {
    throw new Error('Redis adapter không khả dụng')
  }
  return { pubClient, subClient }
}

export function isRedisAdapterActive(): boolean {
  return redisAdapterEnabled && !!pubClient && !!subClient
}

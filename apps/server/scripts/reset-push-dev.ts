/**
 * Reset môi trường dev cho test web-push:
 * 1) Xóa toàn bộ `push_subscriptions` (đăng nhập lại + cho phép thông báo để tạo mới).
 * 2) Xóa mọi key Redis `presence:user:*` (tránh bộ đếm kẹt sau reconnect / HMR).
 *
 * Chạy: npx tsx scripts/reset-push-dev.ts
 * Hoặc: npm run push:reset-dev --workspace=apps/server
 */
import '../src/config/env'
import { env } from '../src/config/env'
import { prisma } from '../src/config/prisma'
import IORedis from 'ioredis'

async function main() {
  console.log('═'.repeat(56))
  console.log('  reset-push-dev — xóa push_subscriptions + presence:user:*')
  console.log('═'.repeat(56))

  const deletedSubs = await prisma.pushSubscription.deleteMany({})
  console.log(`✓ Đã xóa ${deletedSubs.count} bản ghi push_subscriptions.`)

  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  try {
    const keys = await redis.keys('presence:user:*')
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`✓ Đã xóa ${keys.length} key Redis presence:user:*`)
    } else {
      console.log('  (Không có key presence:user:*.)')
    }
    await redis.quit()
  } catch (e) {
    console.error('✗ Redis:', e instanceof Error ? e.message : e)
    try {
      await redis.quit()
    } catch {
      /* ignore */
    }
    process.exit(1)
  }

  await prisma.$disconnect()
  console.log('\n→ Mở lại app, đăng nhập, chạm trang → Allow thông báo → chạy npm run push:selftest để kiểm tra.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

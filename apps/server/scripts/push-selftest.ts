import '../src/config/env'
import { env } from '../src/config/env'
import { prisma } from '../src/config/prisma'
import IORedis from 'ioredis'
import webpush from 'web-push'
import { pushRepository } from '../src/features/push/push.repository'
import { presenceUserKey } from '../src/features/push/presence.util'

const NOTIFY_QUEUE = 'notify-message'

function printSection(title: string) {
  console.log(`\n── ${title} ──`)
}

async function main() {
  const args = process.argv.slice(2)
  const sendIdx = args.indexOf('--send')
  const sendUserId = sendIdx >= 0 ? args[sendIdx + 1] : null

  console.log('═'.repeat(60))
  console.log('  PUSH / WEB-PUSH — SELF-TEST (DB + Redis + VAPID + tùy chọn gửi thử)')
  console.log('═'.repeat(60))
  console.log('  Chạy từ thư mục apps/server:')
  console.log('    npx tsx scripts/push-selftest.ts')
  console.log('    npx tsx scripts/push-selftest.ts --send <userId_cuid>')
  console.log('═'.repeat(60))

  printSection('1. Biến môi trường')
  const hasVapid =
    Boolean(env.VAPID_PUBLIC_KEY?.trim()) && Boolean(env.VAPID_PRIVATE_KEY?.trim())
  console.log(`  VAPID_PUBLIC_KEY:  ${hasVapid ? `OK (${env.VAPID_PUBLIC_KEY!.length} ký tự)` : 'THIẾU'}`)
  console.log(`  VAPID_PRIVATE_KEY: ${hasVapid ? 'OK' : 'THIẾU'}`)
  console.log(`  VAPID_SUBJECT:       ${env.VAPID_SUBJECT || '(trống)'}`)
  console.log(`  CLIENT_URL:          ${env.CLIENT_URL}`)
  console.log(`  REDIS_URL:           ${env.REDIS_URL.replace(/:[^:@/]+@/, ':****@')}`)
  console.log(`  DATABASE_URL:        ${env.DATABASE_URL ? 'đã set (ẩn)' : 'THIẾU'}`)

  if (!hasVapid) {
    console.log('\n  ⚠ Không enqueue job push / worker không gửi được nếu thiếu VAPID.')
  }

  printSection('2. web-push (VAPID pair)')
  try {
    if (hasVapid) {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
      console.log('  ✓ setVapidDetails thành công.')
    } else {
      console.log('  ⊘ Bỏ qua (thiếu key).')
    }
  } catch (e) {
    console.error('  ✗ Lỗi VAPID:', e instanceof Error ? e.message : e)
  }

  printSection('3. Redis (BullMQ + presence)')
  let redis: IORedis | null = null
  try {
    redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
    const pong = await redis.ping()
    console.log(`  ✓ PING → ${pong}`)
  } catch (e) {
    console.error('  ✗ Redis không kết nối:', e instanceof Error ? e.message : e)
  }

  printSection('4. Database — push_subscriptions')
  try {
    const total = await prisma.pushSubscription.count()
    console.log(`  Tổng bản ghi: ${total}`)

    const byUser = await prisma.pushSubscription.groupBy({
      by: ['userId'],
      _count: { _all: true },
    })
    if (byUser.length === 0) {
      console.log('  ⚠ Không có subscription nào — client chưa POST /api/push/subscribe thành công.')
      console.log('    Gợi ý: đăng nhập → Notification permission = granted → mở console (F12) xem log [push]...')
    } else {
      console.log('  Theo userId:')
      for (const row of byUser) {
        console.log(`    - ${row.userId}  →  ${row._count._all} endpoint(s)`)
      }
    }

    const sample = await prisma.pushSubscription.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { userId: true, endpoint: true, createdAt: true },
    })
    if (sample.length) {
      console.log('  Mẫu (mới nhất):')
      for (const s of sample) {
        console.log(`    ${s.userId.slice(0, 8)}…  ${s.endpoint.slice(0, 52)}…`)
      }
    }
  } catch (e) {
    console.error('  ✗ Prisma:', e instanceof Error ? e.message : e)
  }

  printSection('5. Presence Redis (mẫu userId nếu có subscription)')
  try {
    const one = await prisma.pushSubscription.findFirst({ select: { userId: true } })
    if (redis && one) {
      const key = presenceUserKey(one.userId)
      const v = await redis.get(key)
      console.log(`  Key ${key}`)
      console.log(`  Giá trị: ${v === null ? '(không có key — coi như offline)' : v}`)
      console.log(
        `  → Worker chỉ gửi push khi user không online (presence = 0 / không có key).`
      )
    } else if (!one) {
      console.log('  ⊘ Không có user nào có subscription để test key.')
    }
  } catch (e) {
    console.error('  ✗', e instanceof Error ? e.message : e)
  }

  if (redis) {
    try {
      await redis.quit()
    } catch {
      /* ignore */
    }
    redis = null
  }

  if (sendUserId && hasVapid) {
    printSection(`6. Gửi thử web-push tới user ${sendUserId}`)
    const subs = await pushRepository.listSubscriptionsByUserId(sendUserId)
    if (subs.length === 0) {
      console.log('  ✗ Không có subscription trong DB cho user này.')
      console.log('    Đăng nhập bằng tài khoản đó trên trình duyệt, đồng ý thông báo, và xem log [push] trên client.')
    } else {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
      const payload = JSON.stringify({
        title: '[Self-test] Chat App',
        body: 'Nếu thấy thông báo này, web-push + SW hoạt động.',
        url: `${env.CLIENT_URL.replace(/\/$/, '')}/chat`,
        conversationId: '',
        messageId: '',
      })
      for (const row of subs) {
        const sub = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        }
        try {
          await webpush.sendNotification(sub, payload, { TTL: 60 })
          console.log(`  ✓ Đã gửi tới ${row.endpoint.slice(0, 56)}…`)
        } catch (err: unknown) {
          const status =
            typeof err === 'object' && err && 'statusCode' in err
              ? (err as { statusCode?: number }).statusCode
              : undefined
          console.error(`  ✗ Gửi thất bại (HTTP ${status}):`, row.endpoint.slice(0, 48))
        }
      }
    }
  } else if (sendUserId && !hasVapid) {
    console.log('\n  ⊘ Bỏ qua --send vì thiếu VAPID.')
  }

  printSection('Ghi chú (đăng xuất / đăng nhập)')
  console.log(`
  - Đăng xuất chỉ xóa cookie JWT; quyền Notification của trình duyệt vẫn có thể là "granted".
  - Sau khi đăng nhập lại, cần để app gọi POST /api/push/subscribe (mở /chat, xem console [push]).
  - Nếu vẫn "không có subscription" trong DB: mở DevTools → Network → filter "subscribe"
    → phải thấy 201 (hoặc lỗi 4xx/5xx để xử lý).
  - Test push: user nhận phải đóng HẾT tab app (hoặc trình duyệt), vì presence "online" sẽ không gửi push.
`)

  await prisma.$disconnect()
  console.log('\n✓ Self-test kết thúc.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

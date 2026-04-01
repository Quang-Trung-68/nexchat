import './config/env'

import { initRedis } from './config/redis'
import { startNotifyMessageWorker } from './features/push/notifyMessage.worker'
import { startMailWorker } from './features/mail/mail.worker'

void (async () => {
  try {
    await initRedis()
  } catch (e) {
    console.error('[Worker] Redis bắt buộc — kiểm tra REDIS_URL.', e)
    process.exit(1)
  }
  startNotifyMessageWorker()
  startMailWorker()
  console.log('[Worker] notify-message + outbound-mail workers đã chạy')
})()

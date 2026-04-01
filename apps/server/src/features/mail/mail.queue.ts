import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/config/env'

export const OUTBOUND_MAIL_QUEUE = 'outbound-mail'
export const MAIL_SEND_JOB = 'mail:send'

export type MailJobPayload =
  | { template: 'verification'; to: string; code: string }
  | { template: 'forgot_otp'; to: string; code: string }
  | { template: 'password_changed'; to: string }
  | { template: 'password_reset_success'; to: string }
  | { template: 'password_set'; to: string }

let connection: IORedis | null = null
let mailQueue: Queue | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function getMailQueue(): Queue {
  if (!mailQueue) {
    mailQueue = new Queue(OUTBOUND_MAIL_QUEUE, {
      connection: getConnection(),
    })
  }
  return mailQueue
}

const defaultJobOpts = {
  removeOnComplete: 200,
  removeOnFail: 400,
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 3000 },
}

export async function enqueueMail(payload: MailJobPayload): Promise<void> {
  const q = getMailQueue()
  await q.add(MAIL_SEND_JOB, payload, defaultJobOpts)
}

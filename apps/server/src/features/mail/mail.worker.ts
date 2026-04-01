import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/config/env'
import {
  MAIL_SEND_JOB,
  OUTBOUND_MAIL_QUEUE,
  type MailJobPayload,
} from './mail.queue'
import { sendMailJob } from './mail.send'

export function startMailWorker(): Worker<MailJobPayload> {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  })

  const worker = new Worker<MailJobPayload>(
    OUTBOUND_MAIL_QUEUE,
    async (job) => {
      try {
        await sendMailJob(job.data)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(
          JSON.stringify({
            level: 'error',
            event: 'mail_failed',
            jobId: job.id,
            template: job.data.template,
            error: msg,
          })
        )
        throw err
      }
    },
    { connection, concurrency: 3 }
  )

  worker.on('failed', (job, err) => {
    console.log(
      JSON.stringify({
        level: 'error',
        event: 'mail_job_failed',
        jobId: job?.id,
        error: err?.message,
      })
    )
  })

  return worker
}

import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/config/env'

export const NOTIFY_MESSAGE_QUEUE = 'notify-message'
export const NOTIFY_MESSAGE_JOB = 'notify:message'

export const NOTIFY_FRIEND_REQUEST_JOB = 'notify:friend_request'
export const NOTIFY_FRIEND_ACCEPTED_JOB = 'notify:friend_accepted'

export type NotifyMessageJobPayload = {
  messageId: string
  conversationId: string
  senderId: string
}

export type NotifyFriendRequestPayload = {
  friendshipId: string
  requesterId: string
  addresseeId: string
}

export type NotifyFriendAcceptedPayload = {
  friendshipId: string
  recipientIds: string[]
  conversationId: string | null
  title: string
  body: string
}

let connection: IORedis | null = null
let notifyQueue: Queue | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function getNotifyMessageQueue(): Queue | null {
  if (!env.VAPID_PUBLIC_KEY?.trim() || !env.VAPID_PRIVATE_KEY?.trim()) {
    return null
  }
  if (!notifyQueue) {
    notifyQueue = new Queue(NOTIFY_MESSAGE_QUEUE, {
      connection: getConnection(),
    })
  }
  return notifyQueue
}

const defaultJobOpts = {
  delay: 2500,
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
}

export async function enqueueNotifyMessageJob(payload: NotifyMessageJobPayload): Promise<void> {
  const q = getNotifyMessageQueue()
  if (!q) return
  await q.add(NOTIFY_MESSAGE_JOB, payload, defaultJobOpts)
}

export async function enqueueNotifyFriendRequestJob(
  payload: NotifyFriendRequestPayload
): Promise<void> {
  const q = getNotifyMessageQueue()
  if (!q) return
  await q.add(NOTIFY_FRIEND_REQUEST_JOB, payload, defaultJobOpts)
}

export async function enqueueNotifyFriendAcceptedJob(
  payload: NotifyFriendAcceptedPayload
): Promise<void> {
  const q = getNotifyMessageQueue()
  if (!q) return
  await q.add(NOTIFY_FRIEND_ACCEPTED_JOB, payload, defaultJobOpts)
}

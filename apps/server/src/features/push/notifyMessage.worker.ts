import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import webpush from 'web-push'
import type { MessageType } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { pushRepository } from './push.repository'
import { isUserPresenceOnline } from './presence.util'
import {
  NOTIFY_FRIEND_ACCEPTED_JOB,
  NOTIFY_FRIEND_REQUEST_JOB,
  NOTIFY_MESSAGE_JOB,
  NOTIFY_MESSAGE_QUEUE,
  type NotifyFriendAcceptedPayload,
  type NotifyFriendRequestPayload,
  type NotifyMessageJobPayload,
} from './notifyMessage.queue'

function previewFromMessage(m: {
  type: MessageType
  content: string | null
}): string {
  if (m.type === 'IMAGE') return 'Đã gửi ảnh'
  if (m.type === 'FILE') return 'Đã gửi file'
  const c = m.content?.trim()
  if (c) return c.length > 120 ? `${c.slice(0, 117)}…` : c
  return 'Tin nhắn mới'
}

function senderLabel(displayName: string | null, username: string): string {
  const d = displayName?.trim()
  return d || username
}

async function sendWebPushToUserIfOffline(
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  let online = await isUserPresenceOnline(userId)
  if (online) {
    await new Promise((r) => setTimeout(r, 3500))
    online = await isUserPresenceOnline(userId)
  }
  if (online) {
    await new Promise((r) => setTimeout(r, 5000))
    online = await isUserPresenceOnline(userId)
  }
  if (online) {
    if (env.NODE_ENV === 'development') {
      console.log(
        '[Push worker] bỏ qua (user vẫn online trên web / presence Redis > 0)',
        userId
      )
    }
    return
  }

  const payload = JSON.stringify(data)
  const subs = await pushRepository.listSubscriptionsByUserId(userId)
  if (subs.length === 0 && env.NODE_ENV === 'development') {
    console.log(
      '[Push worker] không có subscription push (đăng nhập + Allow + POST /subscribe)',
      userId
    )
  }
  for (const row of subs) {
    const sub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }
    try {
      await webpush.sendNotification(sub, payload, {
        TTL: 60 * 60 * 12,
        urgency: 'normal',
      })
      if (env.NODE_ENV === 'development') {
        console.log('[Push worker] đã gửi tới endpoint', row.endpoint.slice(0, 48) + '…')
      }
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      if (status === 404 || status === 410) {
        await pushRepository.deleteByEndpoint(row.endpoint)
      } else if (env.NODE_ENV === 'development') {
        console.warn('[Push worker] send failed', status, row.endpoint.slice(0, 48))
      }
    }
  }
}

async function processMessageJob(jobData: NotifyMessageJobPayload): Promise<void> {
  const { messageId, conversationId, senderId } = jobData

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId, deletedAt: null },
    select: {
      id: true,
      type: true,
      content: true,
      sender: { select: { displayName: true, username: true } },
    },
  })
  if (!message) return

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, deletedAt: null },
    select: { type: true, name: true },
  })
  if (!conversation) return

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId, deletedAt: null },
    select: { userId: true },
  })

  const recipientIds = participants.map((p) => p.userId).filter((id) => id !== senderId)
  const preview = previewFromMessage(message)
  const senderName = senderLabel(message.sender.displayName, message.sender.username)

  const title =
    conversation.type === 'DM' ? senderName : conversation.name?.trim() || 'Nhóm chat'
  const body = conversation.type === 'DM' ? preview : `${senderName}: ${preview}`

  const openUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/chat/${conversationId}`

  for (const userId of recipientIds) {
    await sendWebPushToUserIfOffline(userId, {
      title,
      body,
      url: openUrl,
      conversationId,
      messageId,
    })
  }
}

async function processFriendRequestJob(jobData: NotifyFriendRequestPayload): Promise<void> {
  const { requesterId, addresseeId, friendshipId } = jobData

  const requester = await prisma.user.findFirst({
    where: { id: requesterId, deletedAt: null },
    select: { displayName: true, username: true },
  })
  if (!requester) return

  const name = senderLabel(requester.displayName, requester.username)
  const base = env.CLIENT_URL.replace(/\/$/, '')
  await sendWebPushToUserIfOffline(addresseeId, {
    title: 'Lời mời kết bạn',
    body: `${name} muốn kết bạn`,
    url: `${base}/chat`,
    friendshipId,
    kind: 'friend_request',
  })
}

async function processFriendAcceptedJob(jobData: NotifyFriendAcceptedPayload): Promise<void> {
  const { recipientIds, title, body, conversationId } = jobData
  const base = env.CLIENT_URL.replace(/\/$/, '')
  const url = conversationId ? `${base}/chat/${conversationId}` : `${base}/chat`

  for (const userId of recipientIds) {
    await sendWebPushToUserIfOffline(userId, {
      title,
      body,
      url,
      conversationId: conversationId ?? undefined,
      kind: 'friend_accepted',
    })
  }
}

export function startNotifyMessageWorker(): void {
  if (!env.VAPID_PUBLIC_KEY?.trim() || !env.VAPID_PRIVATE_KEY?.trim()) {
    console.warn('[Push worker] Thiếu VAPID — worker không khởi động.')
    return
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  )

  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

  const worker = new Worker(
    NOTIFY_MESSAGE_QUEUE,
    async (job) => {
      if (job.name === NOTIFY_MESSAGE_JOB) {
        await processMessageJob(job.data as NotifyMessageJobPayload)
        return
      }
      if (job.name === NOTIFY_FRIEND_REQUEST_JOB) {
        await processFriendRequestJob(job.data as NotifyFriendRequestPayload)
        return
      }
      if (job.name === NOTIFY_FRIEND_ACCEPTED_JOB) {
        await processFriendAcceptedJob(job.data as NotifyFriendAcceptedPayload)
      }
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    console.error('[Push worker] job failed', job?.id, err?.message)
  })
}

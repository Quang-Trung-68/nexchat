import { NotificationType } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { AppError } from '@/shared/errors/AppError'
import { emitFriendRequestReceived, emitFriendUpdatedToBoth } from './friendSocket.emit'
import { friendsRepository } from './friends.repository'
import {
  enqueueNotifyFriendAcceptedJob,
  enqueueNotifyFriendRequestJob,
} from '@/features/push/notifyMessage.queue'

const userPublic = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

function label(u: { displayName: string; username: string }): string {
  const d = u.displayName.trim()
  return d || u.username
}

async function getOrCreateDmId(userA: string, userB: string): Promise<string> {
  const existing = await friendsRepository.findDmConversationIdBetweenUsers(userA, userB)
  if (existing) return existing
  return friendsRepository.createDmConversation(userA, userB)
}

async function acceptMutualFriendship(
  requesterId: string,
  addresseeId: string,
  reverseFriendshipId: string
) {
  const updated = await prisma.friendship.update({
    where: { id: reverseFriendshipId },
    data: { status: 'ACCEPTED' },
    include: {
      requester: { select: userPublic },
      addressee: { select: userPublic },
    },
  })

  const conversationId = await getOrCreateDmId(requesterId, addresseeId)

  await prisma.notification.createMany({
    data: [
      {
        userId: updated.addresseeId,
        type: NotificationType.FRIEND_ACCEPTED,
        title: 'Kết bạn',
        body: `Bạn và ${label(updated.requester)} đã trở thành bạn bè`,
        data: { friendshipId: updated.id, conversationId },
      },
      {
        userId: updated.requesterId,
        type: NotificationType.FRIEND_ACCEPTED,
        title: 'Kết bạn',
        body: `Bạn và ${label(updated.addressee)} đã trở thành bạn bè`,
        data: { friendshipId: updated.id, conversationId },
      },
    ],
  })

  emitFriendUpdatedToBoth(requesterId, addresseeId, {
    friendshipId: updated.id,
    status: 'ACCEPTED',
    conversationId,
  })

  await enqueueNotifyFriendAcceptedJob({
    friendshipId: updated.id,
    recipientIds: [requesterId, addresseeId],
    conversationId,
    title: 'Kết bạn',
    body: 'Bạn có một cuộc trò chuyện mới',
  })

  return {
    friendship: updated,
    mutual: true as const,
    conversationId,
  }
}

export const friendsService = {
  async sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new AppError('Không thể gửi lời mời cho chính mình', 400, 'INVALID_TARGET')
    }

    const addressee = await prisma.user.findFirst({
      where: { id: addresseeId, deletedAt: null },
      select: userPublic,
    })
    if (!addressee) {
      throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND')
    }

    const forward = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId, addresseeId },
      },
    })
    const reverse = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: addresseeId, addresseeId: requesterId },
      },
      include: {
        requester: { select: userPublic },
        addressee: { select: userPublic },
      },
    })

    if (forward?.status === 'BLOCKED' || reverse?.status === 'BLOCKED') {
      throw new AppError('Không thể gửi lời mời', 403, 'FRIEND_BLOCKED')
    }
    if (forward?.status === 'ACCEPTED' || reverse?.status === 'ACCEPTED') {
      throw new AppError('Hai người đã là bạn bè', 409, 'ALREADY_FRIENDS')
    }

    if (reverse?.status === 'PENDING') {
      return acceptMutualFriendship(requesterId, addresseeId, reverse.id)
    }

    if (forward?.status === 'PENDING') {
      throw new AppError('Bạn đã gửi lời mời trước đó', 409, 'REQUEST_PENDING')
    }

    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: requesterId },
      select: userPublic,
    })

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
      include: {
        requester: { select: userPublic },
        addressee: { select: userPublic },
      },
    })

    await prisma.notification.create({
      data: {
        userId: addresseeId,
        type: NotificationType.FRIEND_REQUEST,
        title: 'Lời mời kết bạn',
        body: `${label(requester)} muốn kết bạn`,
        data: { friendshipId: friendship.id, requesterId },
      },
    })

    emitFriendRequestReceived(addresseeId, {
      friendship: {
        id: friendship.id,
        requester: friendship.requester,
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    })

    await enqueueNotifyFriendRequestJob({
      friendshipId: friendship.id,
      requesterId,
      addresseeId,
    })

    return {
      friendship,
      mutual: false as const,
      conversationId: null as string | null,
    }
  },

  async acceptIncoming(addresseeId: string, friendshipId: string) {
    const row = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        addresseeId,
        status: 'PENDING',
      },
      include: {
        requester: { select: userPublic },
        addressee: { select: userPublic },
      },
    })
    if (!row) {
      throw new AppError('Không tìm thấy lời mời', 404, 'NOT_FOUND')
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        requester: { select: userPublic },
        addressee: { select: userPublic },
      },
    })

    const conversationId = await getOrCreateDmId(row.requesterId, row.addresseeId)

    await prisma.notification.create({
      data: {
        userId: row.requesterId,
        type: NotificationType.FRIEND_ACCEPTED,
        title: 'Lời mời đã được chấp nhận',
        body: `${label(row.addressee)} đã chấp nhận lời mời kết bạn`,
        data: { friendshipId: updated.id, conversationId },
      },
    })

    emitFriendUpdatedToBoth(row.requesterId, row.addresseeId, {
      friendshipId: updated.id,
      status: 'ACCEPTED',
      conversationId,
    })

    await enqueueNotifyFriendAcceptedJob({
      friendshipId: updated.id,
      recipientIds: [row.requesterId],
      conversationId,
      title: 'Kết bạn',
      body: `${label(row.addressee)} đã chấp nhận lời mời kết bạn`,
    })

    return { friendship: updated, conversationId }
  },

  async removeFriendship(actorId: string, friendshipId: string) {
    const row = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [{ requesterId: actorId }, { addresseeId: actorId }],
      },
    })
    if (!row) {
      throw new AppError('Không tìm thấy', 404, 'NOT_FOUND')
    }

    const otherId = row.requesterId === actorId ? row.addresseeId : row.requesterId

    await prisma.friendship.delete({ where: { id: friendshipId } })

    emitFriendUpdatedToBoth(actorId, otherId, {
      friendshipId,
      status: 'REMOVED',
      conversationId: null,
    })

    return { ok: true as const }
  },

  async listIncoming(userId: string) {
    return prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: userPublic } },
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Lời mời PENDING do chính user gửi (chờ đối phương phản hồi). */
  async listOutgoing(userId: string) {
    return prisma.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: { addressee: { select: userPublic } },
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Một lần gọi: lời mời đến + lời mời đã gửi (trang Contacts dùng chung). */
  async listPendingForUser(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'PENDING' },
        include: { requester: { select: userPublic } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friendship.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: { addressee: { select: userPublic } },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return { incoming, outgoing }
  },

  async getRelationship(meId: string, otherUserId: string) {
    if (meId === otherUserId) {
      return { status: 'self' as const, friendshipId: null as string | null }
    }

    const forward = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: meId, addresseeId: otherUserId },
      },
    })
    const reverse = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: otherUserId, addresseeId: meId },
      },
    })

    const f = forward ?? reverse
    if (!f) {
      return { status: 'none' as const, friendshipId: null as string | null }
    }

    if (f.status === 'BLOCKED') {
      return { status: 'blocked' as const, friendshipId: f.id }
    }
    if (f.status === 'ACCEPTED') {
      return { status: 'accepted' as const, friendshipId: f.id }
    }
    if (f.status === 'PENDING') {
      if (f.requesterId === meId) {
        return { status: 'pending_out' as const, friendshipId: f.id }
      }
      return { status: 'pending_in' as const, friendshipId: f.id }
    }

    return { status: 'none' as const, friendshipId: null as string | null }
  },

  async listAcceptedFriends(userId: string) {
    const rows = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: userPublic },
        addressee: { select: userPublic },
      },
    })

    const items: {
      friendshipId: string
      user: {
        id: string
        username: string
        displayName: string
        avatarUrl: string | null
      }
      dmConversationId: string | null
    }[] = []

    for (const f of rows) {
      const other = f.requesterId === userId ? f.addressee : f.requester
      const dmConversationId =
        (await friendsRepository.findDmConversationIdBetweenUsers(userId, other.id)) ?? null
      items.push({
        friendshipId: f.id,
        user: other,
        dmConversationId,
      })
    }

    items.sort((a, b) =>
      label(a.user).localeCompare(label(b.user), 'vi', { sensitivity: 'base' })
    )

    return { items, total: items.length }
  },
}

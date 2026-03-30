import type { MessageType } from '@prisma/client'
import { AppError } from '@/shared/errors/AppError'
import { messagesRepository } from '@/features/messages/messages.repository'
import { roomsRepository } from './rooms.repository'
import type {
  CreateGroupBody,
  CreatedRoomDto,
  LastMessageDto,
  RoomListItemDto,
} from './rooms.types'

function mapMessageTypeToLastFileType(type: MessageType): LastMessageDto['fileType'] {
  if (type === 'IMAGE') return 'IMAGE'
  if (type === 'FILE') return 'DOCUMENT'
  return null
}

export const roomsService = {
  async listRooms(userId: string): Promise<RoomListItemDto[]> {
    const membership = await roomsRepository.findMembershipRowsForUser(userId)
    const conversationIds = [...new Set(membership.map((m) => m.conversationId))]
    if (conversationIds.length === 0) return []

    const [conversations, participantRows, lastMessageMap] = await Promise.all([
      roomsRepository.findConversationsByIds(conversationIds),
      roomsRepository.findParticipantsForConversations(conversationIds),
      roomsRepository.findLastMessagePerConversation(conversationIds),
    ])

    const lastReadByConv = new Map(membership.map((m) => [m.conversationId, m.lastReadAt]))

    const participantsByConv = new Map<string, typeof participantRows>()
    for (const row of participantRows) {
      const list = participantsByConv.get(row.conversationId) ?? []
      list.push(row)
      participantsByConv.set(row.conversationId, list)
    }

    const unreadCounts = await Promise.all(
      conversationIds.map(async (cid) => {
        const lr = lastReadByConv.get(cid)
        if (!lr) return { cid, count: 0 }
        const count = await roomsRepository.countUnreadMessages(cid, lr)
        return { cid, count }
      })
    )
    const unreadMap = new Map(unreadCounts.map((u) => [u.cid, u.count]))

    const convById = new Map(conversations.map((c) => [c.id, c]))
    const items: RoomListItemDto[] = []

    for (const cid of conversationIds) {
      const conv = convById.get(cid)
      if (!conv) continue

      const parts = participantsByConv.get(cid) ?? []
      const last = lastMessageMap.get(cid)
      const unreadCount = unreadMap.get(cid) ?? 0

      items.push({
        id: conv.id,
        name: conv.name,
        type: conv.type,
        createdAt: conv.createdAt,
        participants: parts.map((p) => ({
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
        })),
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              senderId: last.senderId,
              createdAt: last.createdAt,
              fileType: mapMessageTypeToLastFileType(last.type),
            }
          : null,
        unreadCount,
      })
    }

    items.sort((a, b) => {
      const ta = a.lastMessage?.createdAt.getTime() ?? -1
      const tb = b.lastMessage?.createdAt.getTime() ?? -1
      if (tb !== ta) return tb - ta
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return items
  },

  async createGroup(userId: string, body: CreateGroupBody): Promise<CreatedRoomDto> {
    const uniqueParticipantIds = [...new Set(body.participantIds)]
    if (uniqueParticipantIds.length !== body.participantIds.length) {
      throw new AppError('participantIds không được trùng lặp', 400, 'VALIDATION_ERROR')
    }
    if (uniqueParticipantIds.includes(userId)) {
      throw new AppError('Không thể thêm chính mình vào participantIds', 400, 'VALIDATION_ERROR')
    }

    const users = await roomsRepository.findUsersByIds(uniqueParticipantIds)
    if (users.length !== uniqueParticipantIds.length) {
      throw new AppError('Một hoặc nhiều participant không tồn tại', 400, 'INVALID_PARTICIPANTS')
    }

    const { conversation, participants } = await roomsRepository.createGroupWithParticipants({
      name: body.name,
      creatorId: userId,
      memberIds: uniqueParticipantIds,
    })

    return {
      id: conversation.id,
      name: conversation.name,
      type: conversation.type,
      createdAt: conversation.createdAt,
      participants: participants.map((p) => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        role: p.role,
      })),
    }
  },

  /**
   * Cập nhật `lastReadAt` (không ghi `MessageRead` per-message).
   * `lastReadAt = max(now, createdAt tin nhắn mới nhất)` để khớp unread.
   */
  async markRoomAsRead(userId: string, conversationId: string): Promise<Date> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong room này', 403, 'FORBIDDEN')
    }

    const latest = await roomsRepository.findLastMessageCreatedAt(conversationId)
    const now = new Date()
    const lastReadAt = new Date(Math.max(now.getTime(), latest?.getTime() ?? 0))

    await roomsRepository.updateParticipantLastReadAt(userId, conversationId, lastReadAt)
    return lastReadAt
  },
}

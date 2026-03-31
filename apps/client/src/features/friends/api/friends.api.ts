import { api } from '@/services/api'

export type PublicUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type RelationshipStatus =
  | 'none'
  | 'self'
  | 'blocked'
  | 'accepted'
  | 'pending_out'
  | 'pending_in'

export type AcceptedFriendItem = {
  friendshipId: string
  user: PublicUser
  dmConversationId: string | null
}

export async function fetchAcceptedFriends() {
  const { data } = await api.get<{
    success: boolean
    data: { items: AcceptedFriendItem[]; total: number }
  }>('/friends')
  return data.data
}

export async function fetchUserLookup(q: string) {
  const { data } = await api.get<{ success: boolean; data: { user: PublicUser | null } }>(
    '/users/lookup',
    { params: { q } }
  )
  return data.data
}

export type FriendRequestRow = {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  createdAt: string
  requester: PublicUser
}

export type FriendOutgoingRow = {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  createdAt: string
  addressee: PublicUser
}

export type FriendsPendingPayload = {
  incoming: FriendRequestRow[]
  outgoing: FriendOutgoingRow[]
}

export async function fetchFriendsIncoming() {
  const { data } = await api.get<{
    success: boolean
    data: FriendRequestRow[]
  }>('/friends/incoming')
  return data.data
}

export async function fetchFriendsOutgoing() {
  const { data } = await api.get<{
    success: boolean
    data: FriendOutgoingRow[]
  }>('/friends/outgoing')
  const list = data.data
  return Array.isArray(list) ? list : []
}

/** Một request: incoming + outgoing (trang Lời mời kết bạn). */
export async function fetchFriendsPending() {
  const { data } = await api.get<{
    success: boolean
    data: FriendsPendingPayload
  }>('/friends/pending')
  const d = data.data
  return {
    incoming: Array.isArray(d?.incoming) ? d.incoming : [],
    outgoing: Array.isArray(d?.outgoing) ? d.outgoing : [],
  }
}

/** Chuẩn hoá friendship từ API (POST request) thành row hiển thị ở "Lời mời đã gửi". */
export function friendshipToOutgoingRow(
  friendship: FriendOutgoingRow & { requester?: PublicUser },
): FriendOutgoingRow {
  const createdAt =
    typeof friendship.createdAt === 'string'
      ? friendship.createdAt
      : new Date(friendship.createdAt as unknown as Date).toISOString()
  return {
    id: friendship.id,
    requesterId: friendship.requesterId,
    addresseeId: friendship.addresseeId,
    status: friendship.status,
    createdAt,
    addressee: friendship.addressee,
  }
}

export type PostFriendRequestResponse = {
  mutual: boolean
  conversationId: string | null
  friendship: FriendOutgoingRow & { requester: PublicUser }
}

export async function fetchRelationship(otherUserId: string) {
  const { data } = await api.get<{
    success: boolean
    data: { status: RelationshipStatus; friendshipId: string | null }
  }>(`/friends/relationship/${otherUserId}`)
  return data.data
}

export async function postFriendRequest(addresseeId: string) {
  const { data } = await api.post<{
    success: boolean
    data: PostFriendRequestResponse
  }>('/friends/request', { addresseeId })
  return data.data
}

export async function postAcceptFriend(friendshipId: string) {
  const { data } = await api.post<{
    success: boolean
    data: { conversationId: string; friendship: { id: string } }
  }>(`/friends/accept/${friendshipId}`)
  return data.data
}

export async function deleteFriendship(friendshipId: string) {
  const { data } = await api.delete<{ success: boolean; data: { ok: boolean } }>(
    `/friends/${friendshipId}`
  )
  return data.data
}

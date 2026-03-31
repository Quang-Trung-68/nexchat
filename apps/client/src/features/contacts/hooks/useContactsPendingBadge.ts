import { useFriendsPendingQuery } from '@/features/friends/hooks/useFriendsPendingQuery'

/** Lời mời nhóm: chưa có API — placeholder 0. Chấm đỏ khi có bất kỳ PENDING nào. */
const GROUP_INVITES_PENDING = 0

export function useContactsPendingBadge() {
  const { data: pending } = useFriendsPendingQuery(true)
  const n = (pending?.incoming?.length ?? 0) + GROUP_INVITES_PENDING
  return n > 0
}

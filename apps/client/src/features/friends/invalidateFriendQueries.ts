import type { QueryClient } from '@tanstack/react-query'
import { friendsKeys } from '@/features/friends/friends.keys'

/** Invalidate toàn bộ query con của `friends` (gồm `pending`, `accepted`, …). */
export function invalidateFriendQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: friendsKeys.all })
}

export function refetchPendingFriends(queryClient: QueryClient) {
  return queryClient.refetchQueries({ queryKey: friendsKeys.pending() })
}

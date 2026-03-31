import { useQuery } from '@tanstack/react-query'
import { fetchFriendsPending } from '@/features/friends/api/friends.api'
import { friendsKeys } from '@/features/friends/friends.keys'

export function useFriendsPendingQuery(enabled: boolean) {
  return useQuery({
    queryKey: friendsKeys.pending(),
    queryFn: fetchFriendsPending,
    enabled,
    staleTime: 30_000,
  })
}

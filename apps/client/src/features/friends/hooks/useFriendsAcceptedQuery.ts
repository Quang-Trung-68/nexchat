import { useQuery } from '@tanstack/react-query'
import { fetchAcceptedFriends } from '@/features/friends/api/friends.api'
import { friendsKeys } from '@/features/friends/friends.keys'

export function useFriendsAcceptedQuery(enabled = true) {
  return useQuery({
    queryKey: friendsKeys.accepted(),
    queryFn: fetchAcceptedFriends,
    enabled,
    staleTime: 30_000,
  })
}

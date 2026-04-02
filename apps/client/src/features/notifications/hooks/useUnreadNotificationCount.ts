import { useQuery } from '@tanstack/react-query'
import { fetchUnreadNotificationCount } from '../api/notifications.api'
import { notificationUnreadKeys } from '../queries/notificationQueryKeys'

export { notificationUnreadKeys } from '../queries/notificationQueryKeys'

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationUnreadKeys.count,
    queryFn: fetchUnreadNotificationCount,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

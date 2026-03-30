import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface UserListItem {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: UserListItem[] }>('/users')
      return data.data
    },
  })
}

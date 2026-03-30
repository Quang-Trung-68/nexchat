import { useAuthStore } from '../store/auth.store'
import { useLogout, useMe } from '../queries/auth.queries'

export function useAuth() {
  const { user, isAuthenticated } = useAuthStore()
  const { isPending } = useMe()
  const logoutMutation = useLogout()

  return {
    user,
    isAuthenticated,
    isLoading: isPending,
    logout: () => logoutMutation.mutate(),
  }
}

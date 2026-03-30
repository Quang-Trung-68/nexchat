import { useMe } from '@/features/auth/queries/auth.queries'

/** Hydrates auth state from GET /api/auth/me on app load. */
export function AuthBootstrap() {
  useMe()
  return null
}

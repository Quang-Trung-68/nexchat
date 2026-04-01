import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** Yêu cầu đã đăng nhập và đã xác thực email. Dùng bên trong hoặc cùng `ProtectedRoute`. */
export function VerifiedRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans text-neutral-600">
        Loading...
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!user?.emailVerifiedAt) {
    return <Navigate to="/verify-email" replace />
  }
  return <>{children}</>
}

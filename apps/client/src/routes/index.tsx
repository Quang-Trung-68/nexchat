import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'

function HomePage() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-8 font-sans">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900">💬 Chat App</h1>
        <p className="mt-2 text-neutral-600">
          Xin chào, <span className="font-medium text-neutral-800">{user?.displayName}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
      >
        Đăng xuất
      </button>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

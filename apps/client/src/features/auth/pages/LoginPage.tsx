import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <LoginForm />
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegisterForm } from '../components/RegisterForm'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <RegisterForm />
    </div>
  )
}

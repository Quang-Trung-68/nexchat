import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthBootstrap } from './AuthBootstrap'
import { SocketBootstrap } from './SocketBootstrap'
import { AppRoutes } from '@/routes'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthBootstrap />
        <SocketBootstrap />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryProvider>
  )
}

import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthBootstrap } from './AuthBootstrap'
import { SocketBootstrap } from './SocketBootstrap'
import { DocumentTitleSync } from '@/features/app/DocumentTitleSync'
import { PushPermissionBootstrap } from './PushPermissionBootstrap'
import { AppRoutes } from '@/routes'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthBootstrap />
        <DocumentTitleSync />
        <SocketBootstrap />
        <PushPermissionBootstrap />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryProvider>
  )
}

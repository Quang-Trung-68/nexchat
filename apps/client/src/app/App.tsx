import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AppRoutes } from '@/routes'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryProvider>
  )
}

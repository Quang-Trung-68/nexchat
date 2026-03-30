import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

/** Single in-flight refresh so concurrent 401s share one POST /auth/refresh. */
let refreshPromise: Promise<void> | null = null

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function isAuthEndpointNoRefresh(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  )
}

/** Tránh redirect /login khi refresh thất bại — đang ở trang auth công khai (gây reload vô hạn). */
function shouldRedirectToLoginOnAuthFailure(): boolean {
  const path = window.location.pathname
  return (
    path !== '/login' &&
    path !== '/register' &&
    path !== '/forgot-password' &&
    !path.startsWith('/reset-password')
  )
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as RetryConfig | undefined
    if (status !== 401 || !config) {
      return Promise.reject(error)
    }

    const url = String(config.url ?? '')

    if (url.includes('/auth/refresh')) {
      if (shouldRedirectToLoginOnAuthFailure()) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (isAuthEndpointNoRefresh(url)) {
      return Promise.reject(error)
    }

    if (config._retry) {
      if (!url.includes('/auth/me') && shouldRedirectToLoginOnAuthFailure()) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    try {
      await refreshSession()
      config._retry = true
      return api(config)
    } catch (refreshErr) {
      if (!url.includes('/auth/me') && shouldRedirectToLoginOnAuthFailure()) {
        window.location.href = '/login'
      }
      return Promise.reject(refreshErr)
    }
  }
)

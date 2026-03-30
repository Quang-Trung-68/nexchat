import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Response interceptor — handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: Implement token refresh in Step 3
      // For now, redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

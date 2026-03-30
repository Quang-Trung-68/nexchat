import { api } from '@/services/api'
import type { LoginPayload, RegisterPayload, User } from '../types/auth.types'

type ApiSuccess<T> = { success: true; data: T }
type ApiErr = { success: false; error: { code: string; message: string } }

export async function register(payload: RegisterPayload) {
  return api.post<ApiSuccess<{ user: User }> | ApiErr>('/auth/register', payload)
}

export async function login(payload: LoginPayload) {
  return api.post<ApiSuccess<{ user: User }> | ApiErr>('/auth/login', payload)
}

export async function logout() {
  return api.post<ApiSuccess<Record<string, never>> | ApiErr>('/auth/logout')
}

export async function getMe() {
  return api.get<ApiSuccess<{ user: User }> | ApiErr>('/auth/me')
}

export async function forgotPassword(email: string) {
  return api.post<{ success: boolean; message?: string }>('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  return api.post<ApiSuccess<{ message?: string }> | ApiErr>('/auth/reset-password', {
    token,
    password,
    confirmPassword,
  })
}

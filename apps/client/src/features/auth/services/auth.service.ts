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

export async function resetPassword(payload: {
  email: string
  code: string
  password: string
  confirmPassword: string
}) {
  return api.post<ApiSuccess<{ message?: string }> | ApiErr>('/auth/reset-password', payload)
}

export async function verifyEmail(code: string) {
  return api.post<ApiSuccess<{ user: User }> | ApiErr>('/auth/verify-email', { code })
}

export async function resendVerification() {
  return api.post<{ success: boolean; message?: string }>('/auth/resend-verification')
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}) {
  return api.post<ApiSuccess<{ message?: string }> | ApiErr>('/auth/change-password', payload)
}

export async function setPassword(payload: { newPassword: string; confirmPassword: string }) {
  return api.post<ApiSuccess<{ message?: string }> | ApiErr>('/auth/set-password', payload)
}

export type PatchProfilePayload = {
  displayName?: string
  username?: string
  bio?: string
  phone?: string
  avatarUrl?: string
}

export async function patchProfile(payload: PatchProfilePayload) {
  return api.patch<ApiSuccess<{ user: User }> | ApiErr>('/users/me', payload)
}

export async function uploadAvatar(file: File) {
  const fd = new FormData()
  fd.append('avatar', file)
  return api.post<ApiSuccess<{ user: User }> | ApiErr>('/users/me/avatar', fd)
}

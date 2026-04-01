import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'
import * as authService from '../services/auth.service'
import type { PatchProfilePayload } from '../services/auth.service'
import type { LoginPayload, RegisterPayload, User } from '../types/auth.types'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

function isMeSuccess(
  data: unknown
): data is { success: true; data: { user: User } } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: boolean }).success === true &&
    'data' in data &&
    typeof (data as { data: { user?: User } }).data?.user === 'object'
  )
}

function postAuthNavigate(navigate: ReturnType<typeof useNavigate>, user: User) {
  if (!user.emailVerifiedAt) {
    navigate('/verify-email', { replace: true })
  } else {
    navigate('/chat', { replace: true })
  }
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const res = await authService.getMe()
        const body = res.data
        if (isMeSuccess(body)) {
          setUser(body.data.user)
          return body.data.user
        }
        setUser(null)
        return null
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          setUser(null)
          return null
        }
        throw e
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (res) => {
      const body = res.data
      if (isMeSuccess(body)) {
        setUser(body.data.user)
        queryClient.setQueryData(authKeys.me, body.data.user)
        postAuthNavigate(navigate, body.data.user)
      }
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (res) => {
      const body = res.data
      if (isMeSuccess(body)) {
        setUser(body.data.user)
        queryClient.setQueryData(authKeys.me, body.data.user)
        postAuthNavigate(navigate, body.data.user)
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearUser()
      void queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}

export function useResetPassword() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: {
      email: string
      code: string
      password: string
      confirmPassword: string
    }) => authService.resetPassword(payload),
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (code: string) => authService.verifyEmail(code),
    onSuccess: (res) => {
      const body = res.data
      if (isMeSuccess(body) && body.data.user) {
        setUser(body.data.user)
        queryClient.setQueryData(authKeys.me, body.data.user)
        navigate('/chat', { replace: true })
      }
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authService.resendVerification(),
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      currentPassword: string
      newPassword: string
      confirmNewPassword: string
    }) => authService.changePassword(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useSetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { newPassword: string; confirmPassword: string }) =>
      authService.setPassword(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (payload: PatchProfilePayload) => authService.patchProfile(payload),
    onSuccess: (res) => {
      const body = res.data
      if (isMeSuccess(body)) {
        setUser(body.data.user)
        queryClient.setQueryData(authKeys.me, body.data.user)
      }
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (file: File) => authService.uploadAvatar(file),
    onSuccess: (res) => {
      const body = res.data
      if (isMeSuccess(body)) {
        setUser(body.data.user)
        queryClient.setQueryData(authKeys.me, body.data.user)
      }
    },
  })
}

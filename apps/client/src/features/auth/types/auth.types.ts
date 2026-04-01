export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  phone: string | null
  isOnline: boolean
  lastSeenAt: string
  emailVerifiedAt: string | null
  /** Chỉ có từ GET /me */
  hasPassword?: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  clearUser: () => void
}

export interface RegisterPayload {
  email: string
  username: string
  displayName: string
  password: string
  confirmPassword: string
  phone?: string
}

export interface LoginPayload {
  identifier: string
  password: string
}

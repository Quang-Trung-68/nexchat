export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  isOnline: boolean
  lastSeenAt: string
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
}

export interface LoginPayload {
  email: string
  password: string
}

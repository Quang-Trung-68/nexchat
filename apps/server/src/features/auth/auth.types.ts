export interface JwtPayload {
  sub: string
  email: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface OAuthProfile {
  providerId: string
  email: string
  displayName: string
  avatarUrl?: string
  provider: 'GOOGLE' | 'GITHUB'
}

export interface RegisterDto {
  email: string
  username: string
  displayName: string
  password: string
  confirmPassword: string
  /** Chỉ số, 8–15 ký tự — tìm thêm bạn khớp chính xác. */
  phone?: string
}

export interface LoginDto {
  identifier: string
  password: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  email: string
  code: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface SetPasswordDto {
  newPassword: string
  confirmPassword: string
}

import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import * as crypto from 'node:crypto'
import type { User } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { sendPasswordResetEmail } from '@/config/email'
import { AppError } from '@/shared/errors/AppError'
import { authRepository } from './auth.repository'
import type {
  JwtPayload,
  LoginDto,
  OAuthProfile,
  RegisterDto,
  ResetPasswordDto,
  TokenPair,
} from './auth.types'

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function omitPassword(user: User) {
  const { password: _p, ...rest } = user
  return rest
}

async function createTokenPair(userId: string, email: string): Promise<TokenPair> {
  const accessOpts = { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions
  const refreshOpts = { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  const accessToken = jwt.sign({ sub: userId, email }, env.JWT_ACCESS_SECRET, accessOpts)
  const refreshToken = jwt.sign({ sub: userId, email }, env.JWT_REFRESH_SECRET, refreshOpts)
  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload
  const exp = decoded.exp
  if (!exp) {
    throw new Error('Invalid refresh token payload')
  }
  const expiresAt = new Date(exp * 1000)
  const tokenHash = hashToken(refreshToken)
  await authRepository.createRefreshToken(userId, tokenHash, expiresAt)
  return { accessToken, refreshToken }
}

export const authService = {
  generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    return createTokenPair(userId, email)
  },

  async register(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    const existingEmail = await authRepository.findUserByEmail(dto.email)
    if (existingEmail) {
      throw new AppError('Email đã được sử dụng', 409, 'ALREADY_EXISTS')
    }
    const existingUsername = await authRepository.findUserByUsername(dto.username)
    if (existingUsername) {
      throw new AppError('Username đã được sử dụng', 409, 'ALREADY_EXISTS')
    }
    if (dto.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: dto.phone, deletedAt: null },
      })
      if (existingPhone) {
        throw new AppError('Số điện thoại đã được sử dụng', 409, 'ALREADY_EXISTS')
      }
    }
    const hashed = await bcrypt.hash(dto.password, 10)
    const user = await authRepository.createUser({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      password: hashed,
      ...(dto.phone ? { phone: dto.phone } : {}),
    })
    return omitPassword(user)
  },

  async login(dto: LoginDto): Promise<{ user: Omit<User, 'password'>; tokens: TokenPair }> {
    const user = await authRepository.findUserByEmail(dto.email)
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }
    if (user.deletedAt) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }
    if (!user.password) {
      throw new AppError(
        'Tài khoản này đăng nhập bằng Google hoặc GitHub. Vui lòng dùng đúng phương thức.',
        400,
        'OAUTH_ONLY_ACCOUNT'
      )
    }
    const ok = await bcrypt.compare(dto.password, user.password)
    if (!ok) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }
    const tokens = await createTokenPair(user.id, user.email)
    return { user: omitPassword(user), tokens }
  },

  async refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload
    try {
      payload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as JwtPayload
    } catch {
      throw new AppError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN')
    }
    const tokenHash = hashToken(rawRefreshToken)
    const record = await authRepository.findRefreshToken(tokenHash)
    if (!record || record.userId !== payload.sub) {
      throw new AppError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN')
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await authRepository.deleteRefreshToken(tokenHash)
      throw new AppError('Refresh token đã hết hạn', 401, 'REFRESH_TOKEN_EXPIRED')
    }
    await authRepository.deleteRefreshToken(tokenHash)
    return createTokenPair(payload.sub, payload.email)
  },

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken)
    await authRepository.deleteRefreshToken(tokenHash)
  },

  async handleOAuthCallback(profile: OAuthProfile): Promise<{ user: User; tokens: TokenPair }> {
    const user = await authRepository.upsertOAuthUser(profile)
    const tokens = await createTokenPair(user.id, user.email)
    return { user, tokens }
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email)
    if (!user) return

    await authRepository.deletePasswordResetTokensForUser(user.id)

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt)

    const resetLink = `${env.CLIENT_URL}/reset-password?token=${rawToken}`
    await sendPasswordResetEmail(user.email, resetLink)
  },

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token)
    const record = await authRepository.findPasswordResetToken(tokenHash)
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError('Token không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_TOKEN')
    }
    const hashed = await bcrypt.hash(dto.password, 10)
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } })
      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      })
      await tx.passwordResetToken.deleteMany({ where: { token: tokenHash } })
    })
  },
}

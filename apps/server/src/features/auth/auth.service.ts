import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import * as crypto from 'node:crypto'
import type { User } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { enqueueMail } from '@/features/mail/mail.queue'
import { AppError } from '@/shared/errors/AppError'
import { authRepository } from './auth.repository'
import type {
  ChangePasswordDto,
  JwtPayload,
  OAuthProfile,
  RegisterDto,
  ResetPasswordDto,
  SetPasswordDto,
  TokenPair,
} from './auth.types'

const EMAIL_VERIFICATION_TTL_MS = 20 * 60 * 1000
const FORGOT_OTP_TTL_MS = 30 * 60 * 1000

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function hashOtp(code: string): string {
  const normalized = code.trim().replace(/\s/g, '')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function generateOtp6(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
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

async function enqueueVerificationEmail(to: string, code: string): Promise<void> {
  await enqueueMail({ template: 'verification', to, code })
}

export const authService = {
  generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    return createTokenPair(userId, email)
  },

  async register(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    const emailNorm = dto.email.trim().toLowerCase()
    const existingEmail = await authRepository.findUserByEmail(emailNorm)
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
      email: emailNorm,
      username: dto.username,
      displayName: dto.displayName,
      password: hashed,
      ...(dto.phone ? { phone: dto.phone } : {}),
    })

    const code = generateOtp6()
    const codeHash = hashOtp(code)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
    await authRepository.upsertEmailVerificationToken(user.id, codeHash, expiresAt)
    await enqueueVerificationEmail(user.email, code)

    return omitPassword(user)
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
    if (!user || user.deletedAt || !user.password) {
      return
    }

    await authRepository.deleteForgotPasswordOtp(user.id)

    const code = generateOtp6()
    const codeHash = hashOtp(code)
    const expiresAt = new Date(Date.now() + FORGOT_OTP_TTL_MS)
    await authRepository.upsertForgotPasswordOtp(user.id, codeHash, expiresAt)
    await enqueueMail({ template: 'forgot_otp', to: user.email, code })
  },

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await authRepository.findUserByEmail(dto.email)
    if (!user || user.deletedAt || !user.password) {
      throw new AppError('Mã không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_CODE')
    }

    const record = await authRepository.findForgotPasswordOtp(user.id)
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError('Mã không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_CODE')
    }

    const codeHash = hashOtp(dto.code)
    if (record.codeHash !== codeHash) {
      throw new AppError('Mã không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_CODE')
    }

    const hashed = await bcrypt.hash(dto.password, 10)
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: user.id } })
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashed },
      })
      await tx.forgotPasswordOtp.deleteMany({ where: { userId: user.id } })
    })

    await enqueueMail({ template: 'password_reset_success', to: user.email })
  },

  async verifyEmail(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND')
    }
    if (user.emailVerifiedAt) {
      throw new AppError('Email đã được xác thực', 400, 'ALREADY_VERIFIED')
    }

    const record = await authRepository.findEmailVerificationToken(userId)
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError('Mã không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_CODE')
    }

    const codeHash = hashOtp(code)
    if (record.codeHash !== codeHash) {
      throw new AppError('Mã không hợp lệ hoặc đã hết hạn', 400, 'INVALID_OR_EXPIRED_CODE')
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      })
      await tx.emailVerificationToken.deleteMany({ where: { userId } })
    })
  },

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND')
    }
    if (user.emailVerifiedAt) {
      throw new AppError('Email đã được xác thực', 400, 'ALREADY_VERIFIED')
    }

    const code = generateOtp6()
    const codeHash = hashOtp(code)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
    await authRepository.upsertEmailVerificationToken(userId, codeHash, expiresAt)
    await enqueueVerificationEmail(user.email, code)
  },

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const row = await authRepository.findUserPasswordFields(userId)
    if (!row?.password) {
      throw new AppError(
        'Tài khoản chưa có mật khẩu. Dùng chức năng đặt mật khẩu.',
        400,
        'USE_SET_PASSWORD'
      )
    }
    const ok = await bcrypt.compare(dto.currentPassword, row.password)
    if (!ok) {
      throw new AppError('Mật khẩu hiện tại không đúng', 400, 'INVALID_PASSWORD')
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10)
    await authRepository.updateUserPassword(userId, hashed)
    await enqueueMail({ template: 'password_changed', to: row.email })
  },

  async setPassword(userId: string, dto: SetPasswordDto): Promise<void> {
    const row = await authRepository.findUserPasswordFields(userId)
    if (!row) {
      throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND')
    }
    if (row.password) {
      throw new AppError('Mật khẩu đã được đặt. Dùng đổi mật khẩu.', 400, 'PASSWORD_ALREADY_SET')
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10)
    await authRepository.updateUserPassword(userId, hashed)
    await enqueueMail({ template: 'password_set', to: row.email })
  },
}

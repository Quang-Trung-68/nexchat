import type { Prisma, User } from '@prisma/client'
import { OAuthProvider } from '@prisma/client'
import { prisma } from '@/config/prisma'
import type { OAuthProfile } from './auth.types'

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!
  }
  return s
}

function emailPrefixForUsername(email: string): string {
  const raw = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'user'
  const trimmed = raw.slice(0, 16)
  return trimmed || 'user'
}

async function generateUniqueUsername(email: string): Promise<string> {
  const prefix = emailPrefixForUsername(email)
  for (let attempt = 0; attempt < 20; attempt++) {
    const username = `${prefix}_${randomString(4)}`
    const exists = await prisma.user.findUnique({ where: { username } })
    if (!exists) return username
  }
  throw new Error('Could not generate unique username')
}

export const authRepository = {
  findUserByEmail(email: string) {
    const e = email.trim().toLowerCase()
    return prisma.user.findUnique({ where: { email: e } })
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        phone: true,
        emailVerifiedAt: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    })
  },

  findUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } })
  },

  /** Email (có @), số điện thoại (chỉ chữ số 8–15), hoặc username. */
  findUserByLoginIdentifier(identity: string) {
    const raw = identity.trim()
    if (!raw) return Promise.resolve(null)
    if (raw.includes('@')) {
      return prisma.user.findFirst({
        where: { email: raw.trim().toLowerCase(), deletedAt: null },
      })
    }
    const digitsOnly = raw.replace(/\D/g, '')
    if (digitsOnly.length >= 8 && /^\d+$/.test(digitsOnly)) {
      return prisma.user.findFirst({
        where: { phone: digitsOnly, deletedAt: null },
      })
    }
    return prisma.user.findFirst({
      where: { username: raw.toLowerCase(), deletedAt: null },
    })
  },

  findUserPasswordFields(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true },
    })
  },

  createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data })
  },

  findOAuthAccount(provider: OAuthProvider, providerId: string) {
    return prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    })
  },

  createOAuthAccount(data: Prisma.OAuthAccountCreateInput) {
    return prisma.oAuthAccount.create({ data })
  },

  async upsertOAuthUser(profile: OAuthProfile): Promise<User> {
    const provider =
      profile.provider === 'GOOGLE' ? OAuthProvider.GOOGLE : OAuthProvider.GITHUB

    const existing = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId: profile.providerId } },
      include: { user: true },
    })
    if (existing) return existing.user

    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } })
    if (byEmail) {
      await prisma.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider,
          providerId: profile.providerId,
        },
      })
      if (!byEmail.emailVerifiedAt) {
        return prisma.user.update({
          where: { id: byEmail.id },
          data: { emailVerifiedAt: new Date() },
        })
      }
      return byEmail
    }

    const username = await generateUniqueUsername(profile.email)

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: profile.email,
          username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl ?? null,
          emailVerifiedAt: new Date(),
        },
      })
      await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider,
          providerId: profile.providerId,
        },
      })
      return user
    })
  },

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token: tokenHash, expiresAt },
    })
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { token: tokenHash } })
  },

  deleteRefreshToken(tokenHash: string) {
    return prisma.refreshToken.deleteMany({ where: { token: tokenHash } })
  },

  deleteAllRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } })
  },

  upsertEmailVerificationToken(userId: string, codeHash: string, expiresAt: Date) {
    return prisma.emailVerificationToken.upsert({
      where: { userId },
      create: { userId, codeHash, expiresAt },
      update: { codeHash, expiresAt, createdAt: new Date() },
    })
  },

  deleteEmailVerificationToken(userId: string) {
    return prisma.emailVerificationToken.deleteMany({ where: { userId } })
  },

  findEmailVerificationToken(userId: string) {
    return prisma.emailVerificationToken.findUnique({ where: { userId } })
  },

  upsertForgotPasswordOtp(userId: string, codeHash: string, expiresAt: Date) {
    return prisma.forgotPasswordOtp.upsert({
      where: { userId },
      create: { userId, codeHash, expiresAt },
      update: { codeHash, expiresAt, createdAt: new Date() },
    })
  },

  deleteForgotPasswordOtp(userId: string) {
    return prisma.forgotPasswordOtp.deleteMany({ where: { userId } })
  },

  findForgotPasswordOtp(userId: string) {
    return prisma.forgotPasswordOtp.findUnique({ where: { userId } })
  },

  updateUserPassword(userId: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
  },

  setEmailVerifiedAt(userId: string, at: Date = new Date()) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: at },
    })
  },
}

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
    return prisma.user.findUnique({ where: { email } })
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

  deletePasswordResetTokensForUser(userId: string) {
    return prisma.passwordResetToken.deleteMany({ where: { userId } })
  },

  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, token: tokenHash, expiresAt },
    })
  },

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { token: tokenHash } })
  },

  deletePasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.deleteMany({ where: { token: tokenHash } })
  },

  updateUserPassword(userId: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
  },
}

import type { z } from 'zod'
import { prisma } from '@/config/prisma'
import { uploadImageBufferToCloudinary, ensureCloudinaryConfigured } from '@/config/cloudinary.client'
import { AppError } from '@/shared/errors/AppError'
import { updateProfileBodySchema } from './users.validation'

const userPublic = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

const userMeSelect = {
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
} as const

export const usersService = {
  listUsersExcludingSelf(currentUserId: string) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { not: currentUserId },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: { username: 'asc' },
      take: 100,
    })
  },

  /** Khớp chính xác username hoặc email hoặc phone — không gợi ý / không LIKE. */
  async lookupExactUser(currentUserId: string, q: string) {
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ username: q }, { email: q }, { phone: q }],
      },
      select: userPublic,
    })
    if (!user || user.id === currentUserId) {
      return { user: null }
    }
    return { user }
  },

  async updateProfile(
    userId: string,
    data: z.infer<typeof updateProfileBodySchema>
  ) {
    const hasAny = Object.values(data).some((v) => v !== undefined)
    if (!hasAny) {
      throw new AppError('Không có dữ liệu cập nhật', 400, 'VALIDATION_ERROR')
    }

    if (data.username !== undefined) {
      const taken = await prisma.user.findFirst({
        where: {
          username: data.username,
          deletedAt: null,
          NOT: { id: userId },
        },
      })
      if (taken) {
        throw new AppError('Username đã được sử dụng', 409, 'ALREADY_EXISTS')
      }
    }

    if (data.phone !== undefined && data.phone !== '') {
      const taken = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          deletedAt: null,
          NOT: { id: userId },
        },
      })
      if (taken) {
        throw new AppError('Số điện thoại đã được sử dụng', 409, 'ALREADY_EXISTS')
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio === '' ? null : data.bio }),
        ...(data.phone !== undefined && { phone: data.phone === '' ? null : data.phone }),
        ...(data.avatarUrl !== undefined && {
          avatarUrl: data.avatarUrl === '' ? null : data.avatarUrl,
        }),
      },
      select: userMeSelect,
    })
  },

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new AppError('Thiếu file ảnh', 400, 'VALIDATION_ERROR')
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError('Chỉ chấp nhận file ảnh', 400, 'VALIDATION_ERROR')
    }
    if (!ensureCloudinaryConfigured()) {
      throw new AppError('Chưa cấu hình Cloudinary', 503, 'CLOUDINARY_UNAVAILABLE')
    }
    const url = await uploadImageBufferToCloudinary(file.buffer, `avatars/${userId}`)
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: userMeSelect,
    })
  },
}

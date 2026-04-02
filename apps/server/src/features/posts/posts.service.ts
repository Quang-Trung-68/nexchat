import { NotificationType } from '@prisma/client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { prisma } from '@/config/prisma'
import { getUploadConfig } from '@/config/upload.config'
import { ensureCloudinaryConfigured, uploadImageBufferToCloudinary } from '@/config/cloudinary.client'
import { io } from '@/features/sockets/socketServer'
import { AppError } from '@/shared/errors/AppError'
import { postsRepository, type PostRow, type PostRowWithStats } from './posts.repository'
import type { PostItemDto, PostsPageDto } from './posts.types'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_CONTENT_LEN = 5000

async function notifyFriendsNewPost(authorId: string, dto: PostItemDto): Promise<void> {
  const friendIds = await postsRepository.getAcceptedFriendIds(authorId)
  if (friendIds.length === 0) return

  const author = await prisma.user.findFirst({
    where: { id: authorId, deletedAt: null },
    select: { displayName: true, username: true },
  })
  const name = author?.displayName?.trim() || author?.username || 'Ai đó'
  const preview =
    dto.content.trim().slice(0, 120) || (dto.images.length ? 'Ảnh' : 'Bài nhật ký')

  const notifications = await prisma.$transaction(
    friendIds.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          type: NotificationType.NEW_FRIEND_POST,
          title: 'Nhật ký mới',
          body: `${name} vừa đăng bài: ${preview}`,
          data: { postId: dto.id, authorId },
        },
      })
    )
  )

  for (const n of notifications) {
    io.to(`user:${n.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      notificationId: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      postId: dto.id,
      authorId,
    })
  }
}

function mapRowToDto(row: PostRow | PostRowWithStats): PostItemDto {
  const withStats = row as PostRowWithStats
  const likeCount = withStats._count?.likes ?? 0
  const commentCount = withStats._count?.comments ?? 0
  const likedByMe = Boolean(withStats.likes?.length)
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.author.id,
      displayName: row.author.displayName,
      username: row.author.username,
      avatarUrl: row.author.avatarUrl,
      bio: row.author.bio ?? null,
    },
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      sortOrder: img.sortOrder,
    })),
    likeCount,
    commentCount,
    likedByMe,
  }
}

export const postsService = {
  mapRowToDto,

  async listPosts(
    userId: string,
    query: {
      scope: 'timeline' | 'mine'
      cursor?: string
      newerThan?: string
      limit: number
      q: string
    }
  ): Promise<PostsPageDto> {
    const needle = query.q.trim()
    const friendIds = await postsRepository.getAcceptedFriendIds(userId)

    if (query.scope === 'timeline' && query.newerThan) {
      const ref = await postsRepository.findPostMeta(query.newerThan)
      if (!ref) {
        return { posts: [], nextCursor: null, hasMore: false }
      }
      if (!friendIds.includes(ref.authorId)) {
        throw new AppError('Không có quyền xem bài tham chiếu', 403, 'FORBIDDEN')
      }
      const rows = await postsRepository.findTimelinePostsNewerThan({
        friendIds,
        afterCreatedAt: ref.createdAt,
        afterPostId: ref.id,
        limit: query.limit,
        viewerId: userId,
      })
      return {
        posts: rows.map(mapRowToDto),
        nextCursor: null,
        hasMore: false,
      }
    }

    let whereBase: { authorId: string | { in: string[] }; content?: { contains: string; mode: 'insensitive' } }

    if (query.scope === 'mine') {
      whereBase = { authorId: userId }
    } else {
      if (friendIds.length === 0) {
        return { posts: [], nextCursor: null, hasMore: false }
      }
      whereBase = { authorId: { in: friendIds } }
    }

    if (needle.length > 0) {
      whereBase = {
        ...whereBase,
        content: { contains: needle, mode: 'insensitive' },
      }
    }

    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const meta = await postsRepository.findPostMeta(query.cursor)
      if (!meta) {
        throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
      }
      if (query.scope === 'mine') {
        if (meta.authorId !== userId) {
          throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
        }
      } else {
        if (!friendIds.includes(meta.authorId)) {
          throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
        }
      }
      cursorCreatedAt = meta.createdAt
      cursorId = meta.id
    }

    const rows = await postsRepository.findPostsPage({
      whereBase,
      cursorCreatedAt,
      cursorId,
      limit: query.limit,
      viewerId: userId,
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const nextCursor =
      hasMore && slice.length > 0 ? slice[slice.length - 1]!.id : null

    return {
      posts: slice.map(mapRowToDto),
      nextCursor,
      hasMore,
    }
  },

  async createPost(
    userId: string,
    body: { content: string },
    files: Express.Multer.File[] | undefined
  ): Promise<PostItemDto> {
    const raw = body.content ?? ''
    const content = typeof raw === 'string' ? raw.trim() : ''
    const fileList = files ?? []

    if (content.length > MAX_CONTENT_LEN) {
      throw new AppError(`Nội dung tối đa ${MAX_CONTENT_LEN} ký tự`, 400, 'VALIDATION_ERROR')
    }

    if (!content && fileList.length === 0) {
      throw new AppError('Cần nội dung hoặc ít nhất một ảnh', 400, 'VALIDATION_ERROR')
    }

    const cfg = getUploadConfig()
    if (fileList.length > cfg.maxImagesPerMessage) {
      throw new AppError(`Tối đa ${cfg.maxImagesPerMessage} ảnh mỗi bài`, 400, 'TOO_MANY_FILES')
    }

    if (fileList.length > 0) {
      if (!ensureCloudinaryConfigured()) {
        throw new AppError('Chưa cấu hình Cloudinary', 503, 'CLOUDINARY_UNAVAILABLE')
      }
      for (const f of fileList) {
        if (!IMAGE_MIMES.has(f.mimetype)) {
          throw new AppError(`Định dạng không hỗ trợ: ${f.mimetype}`, 400, 'INVALID_MIME')
        }
        if (f.size > cfg.maxImageBytesPerFile) {
          throw new AppError(
            `Ảnh vượt dung lượng (${cfg.maxImageBytesPerFile} bytes)`,
            400,
            'FILE_TOO_LARGE'
          )
        }
      }
    }

    const post = await postsRepository.createPostWithImages({
      authorId: userId,
      content,
      images: [],
    })

    const folder = `chat/posts/${post.id}`
    const uploads: { url: string; sortOrder: number }[] = []
    for (let i = 0; i < fileList.length; i++) {
      const url = await uploadImageBufferToCloudinary(fileList[i]!.buffer, folder)
      uploads.push({ url, sortOrder: i })
    }

    if (uploads.length === 0) {
      const full = await postsRepository.findPostByIdWithStats(post.id, userId)
      if (!full) {
        throw new AppError('Không tải lại được bài viết', 500, 'INTERNAL_ERROR')
      }
      const dto = mapRowToDto(full)
      await notifyFriendsNewPost(userId, dto)
      return dto
    }

    await prisma.postImage.createMany({
      data: uploads.map((u) => ({
        postId: post.id,
        url: u.url,
        sortOrder: u.sortOrder,
      })),
    })

    const full = await postsRepository.findPostByIdWithStats(post.id, userId)
    if (!full) {
      throw new AppError('Không tải lại được bài viết', 500, 'INTERNAL_ERROR')
    }
    const dto = mapRowToDto(full)
    await notifyFriendsNewPost(userId, dto)
    return dto
  },

  async updatePost(userId: string, postId: string, content: string): Promise<PostItemDto> {
    const trimmed = content.trim()
    if (trimmed.length > MAX_CONTENT_LEN) {
      throw new AppError(`Nội dung tối đa ${MAX_CONTENT_LEN} ký tự`, 400, 'VALIDATION_ERROR')
    }

    const existing = await postsRepository.findPostByIdForUser(postId, userId)
    if (!existing) {
      throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    }
    if (!trimmed && existing.images.length === 0) {
      throw new AppError('Nội dung không được để trống nếu bài không có ảnh', 400, 'VALIDATION_ERROR')
    }

    const updated = await postsRepository.updatePostContent(postId, userId, trimmed)
    if (!updated) {
      throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    }
    const full = await postsRepository.findPostByIdWithStats(postId, userId)
    if (!full) {
      throw new AppError('Không tải lại được bài viết', 500, 'INTERNAL_ERROR')
    }
    return mapRowToDto(full)
  },

  async deletePost(userId: string, postId: string): Promise<void> {
    const ok = await postsRepository.deletePost(postId, userId)
    if (!ok) {
      throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    }
  },
}

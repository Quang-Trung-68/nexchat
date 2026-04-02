import { prisma } from '@/config/prisma'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { io } from '@/features/sockets/socketServer'
import { AppError } from '@/shared/errors/AppError'
import { postsRepository } from './posts.repository'
import { postsService } from './posts.service'

const userPublic = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const

async function assertCanViewPost(viewerId: string, authorId: string): Promise<void> {
  if (viewerId === authorId) return
  const friends = await postsRepository.getAcceptedFriendIds(viewerId)
  if (!friends.includes(authorId)) {
    throw new AppError('Không có quyền xem bài viết', 403, 'FORBIDDEN')
  }
}

function emitPostToAuthorFriends(authorId: string, event: string, payload: unknown) {
  void postsRepository.getAcceptedFriendIds(authorId).then((ids) => {
    const targets = new Set([authorId, ...ids])
    for (const uid of targets) {
      io.to(`user:${uid}`).emit(event, payload)
    }
  })
}

function visibleCommentsFilter(viewerId: string, postAuthorId: string): Record<string, unknown> {
  if (viewerId === postAuthorId) {
    return {}
  }
  return {
    OR: [
      { authorId: viewerId },
      {
        author: {
          OR: [
            { recvFriendships: { some: { status: 'ACCEPTED', requesterId: viewerId } } },
            { sentFriendships: { some: { status: 'ACCEPTED', addresseeId: viewerId } } },
          ],
        },
      },
    ],
  }
}

export const postInteractionsService = {
  async getPostById(viewerId: string, postId: string) {
    const row = await postsRepository.findPostByIdWithStats(postId, viewerId)
    if (!row) {
      throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    }
    await assertCanViewPost(viewerId, row.authorId)

    const totalComments = await prisma.postComment.count({
      where: { postId, deletedAt: null },
    })
    const visFilter = visibleCommentsFilter(viewerId, row.authorId)
    const visibleCount = await prisma.postComment.count({
      where: { postId, deletedAt: null, ...visFilter },
    })
    const hiddenCommentCount = Math.max(0, totalComments - visibleCount)

    return {
      ...postsService.mapRowToDto(row),
      hiddenCommentCount,
    }
  },

  async listComments(
    viewerId: string,
    postId: string,
    query: { cursor?: string; limit: number }
  ) {
    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post) throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    await assertCanViewPost(viewerId, post.authorId)

    const visFilter = visibleCommentsFilter(viewerId, post.authorId)

    const take = query.limit + 1
    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const c = await prisma.postComment.findFirst({
        where: { id: query.cursor, postId },
        select: { id: true, createdAt: true },
      })
      if (!c) throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
      cursorCreatedAt = c.createdAt
      cursorId = c.id
    }

    const cursorWhere =
      cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              { AND: [{ createdAt: cursorCreatedAt }, { id: { lt: cursorId } }] },
            ],
          }
        : undefined

    const rows = await prisma.postComment.findMany({
      where: {
        AND: [
          { postId, deletedAt: null },
          visFilter,
          ...(cursorWhere ? [cursorWhere] : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      include: {
        author: { select: userPublic },
      },
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1]!.id : null

    const totalComments = await prisma.postComment.count({ where: { postId, deletedAt: null } })
    const visibleCount = await prisma.postComment.count({
      where: { postId, deletedAt: null, ...visFilter },
    })
    const hiddenCommentCount = Math.max(0, totalComments - visibleCount)

    return {
      comments: slice.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        author: r.author,
      })),
      nextCursor,
      hasMore,
      hiddenCommentCount,
    }
  },

  async toggleLike(viewerId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post) throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    await assertCanViewPost(viewerId, post.authorId)

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: viewerId } },
    })

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } })
    } else {
      await prisma.postLike.create({ data: { postId, userId: viewerId } })
    }

    const likeCount = await prisma.postLike.count({ where: { postId } })
    const likedByMe = !existing

    emitPostToAuthorFriends(post.authorId, SOCKET_EVENTS.POST_LIKE_UPDATED, {
      postId,
      likeCount,
      likedByMeUserId: viewerId,
      likedByMe,
    })

    return { likeCount, likedByMe }
  },

  async listLikers(viewerId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post) throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    await assertCanViewPost(viewerId, post.authorId)

    if (viewerId !== post.authorId) {
      return { items: [] as { user: { id: string; displayName: string; username: string; avatarUrl: string | null }; likedAt: string }[], restricted: true as const }
    }

    const likes = await prisma.postLike.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: userPublic },
      },
    })

    return {
      items: likes.map((l) => ({ user: l.user, likedAt: l.createdAt.toISOString() })),
      restricted: false as const,
    }
  },

  async createComment(viewerId: string, postId: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed.length) {
      throw new AppError('Nội dung không được để trống', 400, 'VALIDATION_ERROR')
    }
    if (trimmed.length > 2000) {
      throw new AppError('Bình luận tối đa 2000 ký tự', 400, 'VALIDATION_ERROR')
    }

    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post) throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')
    await assertCanViewPost(viewerId, post.authorId)

    const c = await prisma.postComment.create({
      data: {
        postId,
        authorId: viewerId,
        content: trimmed,
      },
      include: {
        author: { select: userPublic },
      },
    })

    const commentCount = await prisma.postComment.count({
      where: { postId, deletedAt: null },
    })

    emitPostToAuthorFriends(post.authorId, SOCKET_EVENTS.POST_COMMENT_UPDATED, {
      postId,
      action: 'create',
      comment: {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      },
      commentCount,
    })

    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.author,
    }
  },

  async updateComment(viewerId: string, postId: string, commentId: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed.length) {
      throw new AppError('Nội dung không được để trống', 400, 'VALIDATION_ERROR')
    }
    if (trimmed.length > 2000) {
      throw new AppError('Bình luận tối đa 2000 ký tự', 400, 'VALIDATION_ERROR')
    }

    const c = await prisma.postComment.findFirst({
      where: { id: commentId, postId, deletedAt: null },
    })
    if (!c) throw new AppError('Không tìm thấy bình luận', 404, 'NOT_FOUND')
    if (c.authorId !== viewerId) {
      throw new AppError('Không có quyền sửa', 403, 'FORBIDDEN')
    }

    const updated = await prisma.postComment.update({
      where: { id: commentId },
      data: { content: trimmed },
      include: { author: { select: userPublic } },
    })

    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (post) {
      emitPostToAuthorFriends(post.authorId, SOCKET_EVENTS.POST_COMMENT_UPDATED, {
        postId,
        action: 'update',
        comment: {
          id: updated.id,
          content: updated.content,
          updatedAt: updated.updatedAt.toISOString(),
          author: updated.author,
        },
      })
    }

    return {
      id: updated.id,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      author: updated.author,
    }
  },

  async deleteComment(viewerId: string, postId: string, commentId: string) {
    const c = await prisma.postComment.findFirst({
      where: { id: commentId, postId, deletedAt: null },
    })
    if (!c) throw new AppError('Không tìm thấy bình luận', 404, 'NOT_FOUND')

    const post = await prisma.post.findFirst({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!post) throw new AppError('Không tìm thấy bài viết', 404, 'NOT_FOUND')

    const isAuthor = c.authorId === viewerId
    const isPostOwner = post.authorId === viewerId
    if (!isAuthor && !isPostOwner) {
      throw new AppError('Không có quyền xóa', 403, 'FORBIDDEN')
    }

    await prisma.postComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })

    const commentCount = await prisma.postComment.count({
      where: { postId, deletedAt: null },
    })

    emitPostToAuthorFriends(post.authorId, SOCKET_EVENTS.POST_COMMENT_UPDATED, {
      postId,
      action: 'delete',
      commentId,
      commentCount,
    })
  },
}

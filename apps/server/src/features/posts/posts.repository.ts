import { prisma } from '@/config/prisma'
import type { Prisma } from '@prisma/client'

const authorSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  bio: true,
} as const

export function buildPostInclude(viewerId: string): Prisma.PostInclude {
  return {
    author: { select: authorSelect },
    images: { orderBy: { sortOrder: 'asc' as const } },
    _count: {
      select: {
        likes: true,
        comments: { where: { deletedAt: null } },
      },
    },
    likes: {
      where: { userId: viewerId },
      select: { id: true },
      take: 1,
    },
  }
}

/** Reload sau tạo/sửa — viewer = author. */
const postIncludeAuthorOnly: Prisma.PostInclude = {
  author: { select: authorSelect },
  images: { orderBy: { sortOrder: 'asc' as const } },
}

export type PostRow = Prisma.PostGetPayload<{ include: typeof postIncludeAuthorOnly }>
export type PostRowWithStats = Prisma.PostGetPayload<{ include: ReturnType<typeof buildPostInclude> }>

export const postsRepository = {
  async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const rows = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    })
    const ids = new Set<string>()
    for (const r of rows) {
      ids.add(r.requesterId === userId ? r.addresseeId : r.requesterId)
    }
    return [...ids]
  },

  async findPostMeta(postId: string) {
    return prisma.post.findFirst({
      where: { id: postId },
      select: { id: true, authorId: true, createdAt: true },
    })
  },

  async findPostByIdForUser(postId: string, userId: string): Promise<PostRowWithStats | null> {
    return prisma.post.findFirst({
      where: { id: postId, authorId: userId },
      include: buildPostInclude(userId),
    })
  },

  async findPostByIdWithStats(postId: string, viewerId: string): Promise<PostRowWithStats | null> {
    return prisma.post.findFirst({
      where: { id: postId },
      include: buildPostInclude(viewerId),
    })
  },

  async findTimelinePostsNewerThan(params: {
    friendIds: string[]
    afterCreatedAt: Date
    afterPostId: string
    limit: number
    viewerId: string
  }): Promise<PostRowWithStats[]> {
    const { friendIds, afterCreatedAt, afterPostId, limit, viewerId } = params
    return prisma.post.findMany({
      where: {
        authorId: { in: friendIds },
        OR: [
          { createdAt: { gt: afterCreatedAt } },
          { AND: [{ createdAt: afterCreatedAt }, { id: { gt: afterPostId } }] },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: buildPostInclude(viewerId),
    })
  },

  async findPostsPage(params: {
    whereBase: Prisma.PostWhereInput
    cursorCreatedAt?: Date
    cursorId?: string
    limit: number
    viewerId: string
  }): Promise<PostRowWithStats[]> {
    const { whereBase, cursorCreatedAt, cursorId, limit, viewerId } = params
    const take = limit + 1

    const cursorBlock =
      cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              {
                AND: [{ createdAt: cursorCreatedAt }, { id: { lt: cursorId } }],
              },
            ],
          }
        : {}

    return prisma.post.findMany({
      where: {
        AND: [whereBase, cursorBlock],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      include: buildPostInclude(viewerId),
    })
  },

  async createPostWithImages(data: {
    authorId: string
    content: string
    images: { url: string; sortOrder: number }[]
  }): Promise<PostRow> {
    return prisma.post.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        images: {
          create: data.images.map((img) => ({
            url: img.url,
            sortOrder: img.sortOrder,
          })),
        },
      },
      include: postIncludeAuthorOnly,
    })
  },

  async updatePostContent(postId: string, authorId: string, content: string): Promise<PostRow | null> {
    try {
      return await prisma.post.update({
        where: { id: postId, authorId },
        data: { content },
        include: postIncludeAuthorOnly,
      })
    } catch {
      return null
    }
  },

  async deletePost(postId: string, authorId: string): Promise<boolean> {
    const r = await prisma.post.deleteMany({
      where: { id: postId, authorId },
    })
    return r.count > 0
  },
}

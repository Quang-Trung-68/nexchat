import type { Request, Response, NextFunction } from 'express'
import {
  commentBodySchema,
  listCommentsQuerySchema,
  listPostsQuerySchema,
  updatePostBodySchema,
} from './posts.validation'
import { postsService } from './posts.service'
import { postInteractionsService } from './postInteractions.service'

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const q = listPostsQuerySchema.parse(req.query)
    const data = await postsService.listPosts(userId, {
      scope: q.scope,
      cursor: q.cursor,
      newerThan: q.newerThan,
      limit: q.limit,
      q: q.q ?? '',
    })
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const content = typeof req.body?.content === 'string' ? req.body.content : ''
    const files = req.files as Express.Multer.File[] | undefined
    const data = await postsService.createPost(userId, { content }, files)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const body = updatePostBodySchema.parse(req.body)
    const data = await postsService.updatePost(userId, postId, body.content)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    await postsService.deletePost(userId, postId)
    res.json({ success: true, data: { ok: true } })
  } catch (e) {
    next(e)
  }
}

export async function getPostById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const data = await postInteractionsService.getPostById(userId, postId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function listComments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const q = listCommentsQuerySchema.parse(req.query)
    const data = await postInteractionsService.listComments(userId, postId, {
      cursor: q.cursor,
      limit: q.limit,
    })
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const body = commentBodySchema.parse(req.body)
    const data = await postInteractionsService.createComment(userId, postId, body.content)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function updateComment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { postId, commentId } = req.params
    const body = commentBodySchema.parse(req.body)
    const data = await postInteractionsService.updateComment(userId, postId, commentId, body.content)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { postId, commentId } = req.params
    await postInteractionsService.deleteComment(userId, postId, commentId)
    res.json({ success: true, data: { ok: true } })
  } catch (e) {
    next(e)
  }
}

export async function toggleLike(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const data = await postInteractionsService.toggleLike(userId, postId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function listLikers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const postId = req.params.postId
    const data = await postInteractionsService.listLikers(userId, postId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

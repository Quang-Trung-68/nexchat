import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@/config/prisma'
import { usersService } from './users.service'

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await usersService.listUsersExcludingSelf(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function lookupUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { q } = req.query as { q: string }
    const data = await usersService.lookupExactUser(userId, q)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const updated = await usersService.updateProfile(userId, req.body)
    const pw = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })
    res.json({
      success: true,
      data: {
        user: { ...updated, hasPassword: !!pw?.password },
      },
    })
  } catch (e) {
    next(e)
  }
}

export async function uploadMyAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Thiếu ảnh (field: avatar)' },
      })
    }
    const updated = await usersService.uploadAvatar(userId, file)
    const pw = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })
    res.json({
      success: true,
      data: {
        user: { ...updated, hasPassword: !!pw?.password },
      },
    })
  } catch (e) {
    next(e)
  }
}

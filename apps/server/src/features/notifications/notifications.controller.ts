import type { Request, Response, NextFunction } from 'express'
import { notificationsService } from './notifications.service'

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const count = await notificationsService.countUnread(userId)
    res.json({ success: true, data: { count } })
  } catch (e) {
    next(e)
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const items = await notificationsService.list(userId, limit)
    res.json({ success: true, data: { items } })
  } catch (e) {
    next(e)
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const id = req.params.id
    const ok = await notificationsService.markRead(userId, id)
    if (!ok) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } })
      return
    }
    res.json({ success: true, data: { ok: true } })
  } catch (e) {
    next(e)
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const n = await notificationsService.markAllRead(userId)
    res.json({ success: true, data: { updated: n } })
  } catch (e) {
    next(e)
  }
}

import type { Request, Response, NextFunction } from 'express'
import { roomsService } from './rooms.service'
import type { CreateGroupBody } from './rooms.types'

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await roomsService.listRooms(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const body = req.body as CreateGroupBody
    const data = await roomsService.createGroup(userId, body)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

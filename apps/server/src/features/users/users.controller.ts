import type { Request, Response, NextFunction } from 'express'
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

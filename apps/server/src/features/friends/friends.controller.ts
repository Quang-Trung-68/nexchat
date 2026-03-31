import type { Request, Response, NextFunction } from 'express'
import { friendsService } from './friends.service'

export async function listAccepted(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await friendsService.listAcceptedFriends(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function sendRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { addresseeId } = req.body as { addresseeId: string }
    const data = await friendsService.sendFriendRequest(userId, addresseeId)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function accept(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { friendshipId } = req.params
    const data = await friendsService.acceptIncoming(userId, friendshipId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { friendshipId } = req.params
    const data = await friendsService.removeFriendship(userId, friendshipId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function listIncoming(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await friendsService.listIncoming(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function listOutgoing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await friendsService.listOutgoing(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await friendsService.listPendingForUser(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function getRelationship(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { otherUserId } = req.params
    const data = await friendsService.getRelationship(userId, otherUserId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

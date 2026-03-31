import type { Request, Response, NextFunction } from 'express'
import { messagesService } from './messages.service'
import { io } from '@/features/sockets/socketServer'
import { emitReactionUpdated } from '@/features/sockets/chatMessageBroadcast'

export async function setReaction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const messageId = req.params.messageId
    const { emoji } = req.body as { emoji: string }

    const { payload, myReactionEmoji } = await messagesService.setReaction(userId, messageId, emoji)
    emitReactionUpdated(io, payload)

    res.json({
      success: true,
      data: {
        messageId: payload.messageId,
        reactionSummary: payload.summary,
        myReactionEmoji,
      },
    })
  } catch (e) {
    next(e)
  }
}

import type { Request, Response, NextFunction } from 'express'
import { messagesService } from './messages.service'
import { io } from '@/features/sockets/socketServer'
import { emitChatMessageUpdated } from '@/features/sockets/chatMessageBroadcast'

export async function uploadMessageImages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const messageId = req.params.messageId
    const files = req.files as Express.Multer.File[] | undefined
    if (!files?.length) {
      return res.status(400).json({ success: false, error: 'Thiếu file (field: images)' })
    }

    const { message, conversationId } = await messagesService.uploadMessageImages(
      userId,
      messageId,
      files
    )

    emitChatMessageUpdated(io, conversationId, message)

    res.json({ success: true, data: message })
  } catch (e) {
    next(e)
  }
}

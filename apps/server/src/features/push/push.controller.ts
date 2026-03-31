import type { Request, Response, NextFunction } from 'express'
import { env } from '@/config/env'

const isDev = env.NODE_ENV === 'development'
import { pushService } from './push.service'
import type { pushSubscribeBodySchema, pushUnsubscribeBodySchema } from './push.validation'
import type { z } from 'zod'

type SubscribeBody = z.infer<typeof pushSubscribeBodySchema>
type UnsubscribeBody = z.infer<typeof pushUnsubscribeBodySchema>

export function getVapidPublicKey(_req: Request, res: Response) {
  res.json({
    success: true,
    data: { publicKey: env.VAPID_PUBLIC_KEY || null },
  })
}

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const body = req.body as SubscribeBody
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null
    const data = await pushService.subscribe(userId, body, ua)
    if (isDev) {
      console.log('[push] subscribe OK', userId.slice(0, 8), body.endpoint.slice(0, 56) + '…')
    }
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const body = req.body as UnsubscribeBody
    const data = await pushService.unsubscribe(userId, body.endpoint)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

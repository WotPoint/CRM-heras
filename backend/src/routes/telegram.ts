import { Router, type Request, type Response } from 'express'
import { randomBytes } from 'crypto'
import { authenticate } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = Router()

let botHandleUpdate: ((update: unknown) => Promise<void>) | null = null
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? ''

/** Регистрируется из bot/startup.ts */
export function registerWebhookHandler(handler: (update: unknown) => Promise<void>): void {
  botHandleUpdate = handler
}

/** GET /api/telegram/link-token — генерирует одноразовый токен привязки (15 мин) */
router.get('/link-token', authenticate, async (req: Request, res: Response) => {
  const token = randomBytes(16).toString('hex')
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { telegramLinkToken: token, telegramLinkExpiry: expiry },
  })

  const url = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=${token}` : null

  logger.info('telegram.link_token_generated', { userId: req.user!.userId })
  res.json({ token, url })
})

/** DELETE /api/telegram/unlink — отвязывает Telegram */
router.delete('/unlink', authenticate, async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { telegramChatId: null, telegramLinkedAt: null, telegramLinkToken: null, telegramLinkExpiry: null },
  })
  logger.info('telegram.unlinked', { userId: req.user!.userId })
  res.json({ ok: true })
})

/** GET /api/telegram/status — статус привязки */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { telegramChatId: true, telegramLinkedAt: true },
  })
  res.json({ linked: !!user?.telegramChatId, linkedAt: user?.telegramLinkedAt ?? null })
})

/** POST /api/telegram/webhook — получает обновления от Telegram */
router.post('/webhook', async (req: Request, res: Response) => {
  // Верификация секрета
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!botHandleUpdate) {
    res.json({ ok: true })
    return
  }

  try {
    await botHandleUpdate(req.body)
  } catch (err) {
    logger.error('telegram.webhook_error', { error: (err as Error).message, stack: (err as Error).stack })
  }

  res.json({ ok: true })
})

export default router

import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate, JWT_SECRET } from '../middleware/auth.js'
import { ownerFilter } from '../lib/helpers.js'
import type { JwtPayload } from '../types/index.js'
import {
  getAuthUrl,
  exchangeCode,
  getAuthClient,
  getGmailProfile,
  sendEmail,
  getGmailThread,
  registerGmailWatch,
  syncInboxForUser,
  GmailNotConnectedError,
} from '../lib/gmail.js'

const router = Router()

// ─── OAuth endpoints (no auth middleware for callback) ────────────────────────

/**
 * GET /api/email/auth/connect?token=<jwt>
 * Generates Google OAuth URL and redirects.
 * Accepts JWT via Authorization header OR ?token= query param
 * (query param needed for direct browser navigation during OAuth flow)
 */
router.get('/auth/connect', (req: Request, res: Response) => {
  try {
    const tokenFromQuery = req.query.token as string | undefined
    const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined
    const token = tokenFromHeader ?? tokenFromQuery

    if (!token) { res.status(401).json({ error: 'Токен не предоставлен' }); return }

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    const state = Buffer.from(JSON.stringify({ userId: payload.userId })).toString('base64')
    res.redirect(getAuthUrl(state))
  } catch {
    res.status(401).json({ error: 'Недействительный или истёкший токен' })
  }
})

/**
 * GET /api/email/auth/url
 * Returns the Google OAuth URL as JSON (for frontend to handle redirect)
 */
router.get('/auth/url', authenticate, (req: Request, res: Response) => {
  const state = Buffer.from(JSON.stringify({ userId: req.user!.userId })).toString('base64')
  res.json({ url: getAuthUrl(state) })
})

/**
 * GET /api/email/auth/callback
 * Google redirects here after consent; exchanges code for tokens
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  try {
    const { code, state, error } = req.query as Record<string, string>

    if (error) {
      res.redirect(`${frontendUrl}/settings?gmail=error&reason=${encodeURIComponent(error)}`)
      return
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/settings?gmail=error&reason=missing_params`)
      return
    }

    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8')) as { userId: string }
    const tokens = await exchangeCode(code)

    const oauth2Client = (await import('../lib/gmail.js')).createOAuth2Client()
    oauth2Client.setCredentials(tokens)
    const gmailEmail = await getGmailProfile(oauth2Client)

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailRefreshToken: tokens.refresh_token ?? undefined,
        gmailAccessToken: tokens.access_token ?? null,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        gmailEmail,
      },
    })

    // Register Pub/Sub watch (best-effort)
    registerGmailWatch(userId).catch(err =>
      console.error('[email/callback] watch registration failed:', err)
    )

    res.redirect(`${frontendUrl}/settings?gmail=connected`)
  } catch (err) {
    console.error('[email/callback]', err)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    res.redirect(`${frontendUrl}/settings?gmail=error&reason=server_error`)
  }
})

/**
 * DELETE /api/email/auth/disconnect
 * Revoke Google OAuth and clear tokens from DB
 */
router.delete('/auth/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (user?.gmailAccessToken) {
      try {
        const auth = await getAuthClient(req.user!.userId)
        await auth.revokeCredentials()
      } catch {
        // If revoke fails (already invalid), continue with cleanup
      }
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        gmailRefreshToken: null,
        gmailAccessToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
        gmailWatchExpiry: null,
        gmailHistoryId: null,
      },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[email/disconnect]', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/email/auth/status
 * Check if current user has Gmail connected
 */
router.get('/auth/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    res.json({
      connected: !!user.gmailRefreshToken,
      gmailEmail: user.gmailEmail ?? null,
      watchExpiresAt: user.gmailWatchExpiry ?? null,
    })
  } catch (err) {
    console.error('[email/status]', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * POST /api/email/webhook
 * Gmail push notification via Google Cloud Pub/Sub
 * No JWT auth — verified by PUBSUB_VERIFICATION_TOKEN query param
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Always respond 200 quickly — Google retries on non-2xx
  res.status(200).json({})

  const token = (req.query as Record<string, string>).token
  if (!token || token !== process.env.PUBSUB_VERIFICATION_TOKEN) return

  try {
    const data = req.body?.message?.data
    if (!data) return

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8')) as {
      emailAddress: string
      historyId: string
    }

    setImmediate(async () => {
      try {
        const user = await prisma.user.findFirst({
          where: { gmailEmail: decoded.emailAddress },
        })
        if (!user) return

        const synced = await syncInboxForUser(user.id)
        if (synced > 0) console.log(`[webhook] synced ${synced} new message(s) for ${decoded.emailAddress}`)
      } catch (err) {
        console.error('[webhook] processGmailNotification error:', err)
      }
    })
  } catch (err) {
    console.error('[webhook] decode error:', err)
  }
})

// ─── All remaining routes require authentication ──────────────────────────────
router.use(authenticate)

// ─── Gmail error handler helper ───────────────────────────────────────────────
function handleGmailError(err: unknown, res: Response): void {
  if (err instanceof GmailNotConnectedError) {
    res.status(400).json({ error: err.message }); return
  }
  const googleErr = err as { code?: number; message?: string }
  if (googleErr.code === 401) {
    res.status(401).json({ error: 'Gmail токен истёк. Переподключите аккаунт в настройках.' }); return
  }
  if (googleErr.code === 429 || googleErr.code === 403) {
    res.status(503).json({ error: 'Gmail API: превышена квота или недостаточно прав. Попробуйте позже.' }); return
  }
  console.error('[email route]', err)
  res.status(502).json({ error: 'Ошибка Gmail API', detail: googleErr.message })
}

// ─── Send new email ───────────────────────────────────────────────────────────

/**
 * POST /api/email/send
 * Compose and send a new email to a client, creating a new thread
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, body, bodyHtml, clientId, dealId } = req.body

    if (!to || !subject || !body) {
      res.status(400).json({ error: 'Поля to, subject, body обязательны' }); return
    }

    const { gmailMessageId, gmailThreadId } = await sendEmail(req.user!.userId, {
      to, subject, body, bodyHtml,
    })

    const now = new Date().toISOString()

    const thread = await prisma.emailThread.create({
      data: {
        id: crypto.randomUUID(),
        gmailThreadId,
        subject,
        clientId: clientId ?? null,
        dealId: dealId ?? null,
        managerId: req.user!.userId,
        lastMessageAt: now,
        createdAt: now,
      },
    })

    const message = await prisma.emailMessage.create({
      data: {
        id: crypto.randomUUID(),
        gmailMessageId,
        threadId: thread.id,
        fromAddress: '',
        toAddress: to,
        subject,
        bodyText: body,
        direction: 'outbound',
        sentAt: now,
        deliveryStatus: 'sent',
        sentByUserId: req.user!.userId,
        createdAt: now,
      },
    })

    res.status(201).json({ thread, message })
  } catch (err) {
    handleGmailError(err, res)
  }
})

// ─── Threads ──────────────────────────────────────────────────────────────────

/**
 * GET /api/email/threads
 * List email threads for current user, with optional clientId/dealId filter
 */
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { clientId, dealId } = req.query as Record<string, string>

    const threads = await prisma.emailThread.findMany({
      where: {
        ...ownerFilter(role, userId, 'managerId'),
        ...(clientId ? { clientId } : {}),
        ...(dealId ? { dealId } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    })

    res.json(threads)
  } catch (err) {
    console.error('[email/threads]', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/email/threads/:threadId
 * Get all messages in a thread
 */
router.get('/threads/:threadId', async (req: Request, res: Response) => {
  try {
    const thread = await prisma.emailThread.findUnique({
      where: { id: req.params.threadId },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    })

    if (!thread) { res.status(404).json({ error: 'Тред не найден' }); return }

    const { role, userId } = req.user!
    if (role === 'manager' && thread.managerId !== userId) {
      res.status(403).json({ error: 'Нет доступа' }); return
    }

    const { messages, ...threadData } = thread
    res.json({ thread: threadData, messages })
  } catch (err) {
    console.error('[email/threads/:id]', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * POST /api/email/threads/:threadId/reply
 * Send a reply within an existing thread
 */
router.post('/threads/:threadId/reply', async (req: Request, res: Response) => {
  try {
    const thread = await prisma.emailThread.findUnique({ where: { id: req.params.threadId } })
    if (!thread) { res.status(404).json({ error: 'Тред не найден' }); return }

    const { role, userId } = req.user!
    if (role === 'manager' && thread.managerId !== userId) {
      res.status(403).json({ error: 'Нет доступа' }); return
    }

    const { body, bodyHtml } = req.body
    if (!body) { res.status(400).json({ error: 'Поле body обязательно' }); return }

    // Get last message for In-Reply-To header
    const lastMsg = await prisma.emailMessage.findFirst({
      where: { threadId: thread.id },
      orderBy: { sentAt: 'desc' },
    })

    const { gmailMessageId } = await sendEmail(userId, {
      to: lastMsg?.fromAddress ?? '',
      subject: `Re: ${thread.subject}`,
      body,
      bodyHtml,
      inReplyTo: lastMsg?.gmailMessageId,
      gmailThreadId: thread.gmailThreadId,
    })

    const now = new Date().toISOString()

    const message = await prisma.emailMessage.create({
      data: {
        id: crypto.randomUUID(),
        gmailMessageId,
        threadId: thread.id,
        fromAddress: '',
        toAddress: lastMsg?.fromAddress ?? '',
        subject: `Re: ${thread.subject}`,
        bodyText: body,
        direction: 'outbound',
        sentAt: now,
        deliveryStatus: 'sent',
        sentByUserId: userId,
        createdAt: now,
      },
    })

    await prisma.emailThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: now },
    })

    res.status(201).json(message)
  } catch (err) {
    handleGmailError(err, res)
  }
})

// ─── Sync + Webhook ───────────────────────────────────────────────────────────

/**
 * POST /api/email/sync
 * Manually trigger inbox sync for current user
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const synced = await syncInboxForUser(req.user!.userId)
    res.json({ synced })
  } catch (err) {
    handleGmailError(err, res)
  }
})

// ─── Fetch Gmail thread directly (live, not cached) ──────────────────────────

/**
 * GET /api/email/threads/:threadId/live
 * Fetch thread directly from Gmail API (bypass local cache)
 */
router.get('/threads/:threadId/live', async (req: Request, res: Response) => {
  try {
    const thread = await prisma.emailThread.findUnique({ where: { id: req.params.threadId } })
    if (!thread) { res.status(404).json({ error: 'Тред не найден' }); return }

    const { role, userId } = req.user!
    if (role === 'manager' && thread.managerId !== userId) {
      res.status(403).json({ error: 'Нет доступа' }); return
    }

    const gmailThread = await getGmailThread(userId, thread.gmailThreadId)
    res.json(gmailThread)
  } catch (err) {
    handleGmailError(err, res)
  }
})

export default router

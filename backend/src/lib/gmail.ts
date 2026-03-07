import { google } from 'googleapis'
import prisma from './prisma.js'

export class GmailNotConnectedError extends Error {
  constructor() {
    super('Gmail не подключён. Подключите аккаунт Google в настройках.')
    this.name = 'GmailNotConnectedError'
  }
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    state,
  })
}

export async function exchangeCode(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getAuthClient(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.gmailRefreshToken) throw new GmailNotConnectedError()

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: user.gmailRefreshToken,
    access_token: user.gmailAccessToken ?? undefined,
    expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
  })

  // Auto-refresh if access token expires within 5 minutes
  const expiresAt = user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : 0
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: credentials.access_token ?? null,
          gmailTokenExpiry: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
        },
      })
      oauth2Client.setCredentials(credentials)
    } catch {
      // If refresh fails, token was revoked — clear tokens
      await prisma.user.update({
        where: { id: userId },
        data: { gmailRefreshToken: null, gmailAccessToken: null, gmailTokenExpiry: null },
      })
      throw new GmailNotConnectedError()
    }
  }

  return oauth2Client
}

export async function getGmailProfile(auth: ReturnType<typeof createOAuth2Client>): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth })
  const res = await gmail.users.getProfile({ userId: 'me' })
  return res.data.emailAddress ?? ''
}

export async function sendEmail(
  userId: string,
  opts: {
    to: string
    subject: string
    body: string
    bodyHtml?: string
    inReplyTo?: string
    gmailThreadId?: string
  }
): Promise<{ gmailMessageId: string; gmailThreadId: string }> {
  const auth = await getAuthClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const subjectEncoded = `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`
  const contentType = opts.bodyHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'

  const lines = [
    `To: ${opts.to}`,
    `Subject: ${subjectEncoded}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
  ]
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  lines.push('', opts.bodyHtml ?? opts.body)

  const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      ...(opts.gmailThreadId ? { threadId: opts.gmailThreadId } : {}),
    },
  })

  return {
    gmailMessageId: res.data.id!,
    gmailThreadId: res.data.threadId!,
  }
}

export async function getGmailThread(userId: string, gmailThreadId: string) {
  const auth = await getAuthClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })
  const res = await gmail.users.threads.get({ userId: 'me', id: gmailThreadId, format: 'full' })
  return res.data
}

export async function registerGmailWatch(userId: string): Promise<void> {
  const topicName = process.env.PUBSUB_TOPIC_NAME
  if (!topicName) {
    console.warn('[gmail] PUBSUB_TOPIC_NAME not set — skipping watch registration')
    return
  }

  const auth = await getAuthClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX', 'SENT'],
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailWatchExpiry: res.data.expiration
        ? new Date(Number(res.data.expiration)).toISOString()
        : null,
      gmailHistoryId: res.data.historyId ?? null,
    },
  })
}

interface GmailHeader { name: string; value: string }

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function getBodyText(payload: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null } | null | undefined): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = getBodyText(part as typeof payload)
      if (text) return text
    }
  }
  return ''
}

export async function syncInboxForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.gmailRefreshToken || !user.gmailHistoryId) return 0

  const auth = await getAuthClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const histRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.gmailHistoryId,
    historyTypes: ['messageAdded'],
  })

  const records = histRes.data.history ?? []
  let synced = 0

  for (const record of records) {
    for (const added of record.messagesAdded ?? []) {
      const msgId = added.message?.id
      if (!msgId) continue

      // Skip if already stored
      const existing = await prisma.emailMessage.findUnique({ where: { gmailMessageId: msgId } })
      if (existing) continue

      const msgRes = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' })
      const msg = msgRes.data
      const headers = (msg.payload?.headers ?? []) as GmailHeader[]

      const fromAddress = getHeader(headers, 'From')
      const toAddress = getHeader(headers, 'To')
      const subject = getHeader(headers, 'Subject')
      const gmailThreadId = msg.threadId ?? ''
      const sentAt = msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString()
      const bodyText = getBodyText(msg.payload)

      // Find or create EmailThread
      let thread = await prisma.emailThread.findUnique({ where: { gmailThreadId } })
      if (!thread) {
        thread = await prisma.emailThread.create({
          data: {
            id: crypto.randomUUID(),
            gmailThreadId,
            subject,
            managerId: userId,
            lastMessageAt: sentAt,
            snippet: msg.snippet ?? '',
            createdAt: new Date().toISOString(),
          },
        })
      } else {
        await prisma.emailThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: sentAt, snippet: msg.snippet ?? undefined },
        })
      }

      await prisma.emailMessage.create({
        data: {
          id: crypto.randomUUID(),
          gmailMessageId: msgId,
          threadId: thread.id,
          fromAddress,
          toAddress,
          subject,
          bodyText,
          direction: 'inbound',
          sentAt,
          deliveryStatus: 'received',
          createdAt: new Date().toISOString(),
        },
      })
      synced++
    }
  }

  // Update historyId to latest
  if (histRes.data.historyId) {
    await prisma.user.update({
      where: { id: userId },
      data: { gmailHistoryId: histRes.data.historyId },
    })
  }

  return synced
}

import { Router, Request, Response } from 'express'
import { createHash, randomBytes, randomUUID } from 'crypto'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// PKCE helpers
function generateCodeVerifier() { return randomBytes(32).toString('base64url') }
function generateCodeChallenge(v: string) { return createHash('sha256').update(v).digest('base64url') }

// In-memory store for OAuth state tokens (state → { userId, codeVerifier, expires })
// TTL: 5 minutes
const linkStates = new Map<string, { userId: string; codeVerifier: string; expires: number }>()

function cleanupExpired() {
  const now = Date.now()
  for (const [key, val] of linkStates) {
    if (val.expires < now) linkStates.delete(key)
  }
}

/**
 * GET /api/vk/link-url
 * Requires auth. Returns VK OAuth URL for linking VK account to existing user.
 */
router.get('/link-url', authenticate, (req: Request, res: Response) => {
  const { VK_CLIENT_ID, VK_REDIRECT_URI_LINK } = process.env
  if (!VK_CLIENT_ID || !VK_REDIRECT_URI_LINK) {
    res.status(500).json({ error: 'VK OAuth не настроен (VK_CLIENT_ID / VK_REDIRECT_URI_LINK)' })
    return
  }

  cleanupExpired()
  const state = randomUUID()
  const codeVerifier = generateCodeVerifier()
  linkStates.set(state, { userId: req.user!.userId, codeVerifier, expires: Date.now() + 5 * 60 * 1000 })

  const params = new URLSearchParams({
    client_id: VK_CLIENT_ID,
    redirect_uri: VK_REDIRECT_URI_LINK,
    response_type: 'code',
    state,
    code_challenge: generateCodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  })
  res.json({ url: `https://id.vk.com/authorize?${params}` })
})

/**
 * GET /api/vk/link/callback
 * VK redirects here after user authorizes. Stores vkId on the user.
 * Public endpoint — no JWT needed (browser redirect from VK).
 */
router.get('/link/callback', async (req: Request, res: Response) => {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const { code, state, device_id } = req.query as { code?: string; state?: string; device_id?: string }

  const entry = state ? linkStates.get(state) : null
  if (!entry || entry.expires < Date.now()) {
    res.redirect(`${FRONTEND_URL}/settings?vk=expired`)
    return
  }
  linkStates.delete(state!)

  if (!code) {
    res.redirect(`${FRONTEND_URL}/settings?vk=error`)
    return
  }

  try {
    const { VK_CLIENT_ID, VK_CLIENT_SECRET, VK_REDIRECT_URI_LINK } = process.env
    if (!VK_CLIENT_ID || !VK_CLIENT_SECRET || !VK_REDIRECT_URI_LINK) {
      res.redirect(`${FRONTEND_URL}/settings?vk=error`)
      return
    }

    // Exchange code for access_token (VK ID OAuth 2.0 + PKCE)
    const tokenBody: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: VK_CLIENT_ID,
      client_secret: VK_CLIENT_SECRET,
      redirect_uri: VK_REDIRECT_URI_LINK,
      code,
      code_verifier: entry.codeVerifier,
    }
    if (device_id) tokenBody.device_id = device_id
    const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenBody),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }

    if (tokenData.error || !tokenData.access_token) {
      console.error('VK link token error:', tokenData)
      res.redirect(`${FRONTEND_URL}/settings?vk=error`)
      return
    }

    // Get VK user info
    const userInfoRes = await fetch('https://id.vk.com/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: tokenData.access_token!, client_id: VK_CLIENT_ID }),
    })
    const userInfo = await userInfoRes.json() as { user?: { user_id: number } }
    const vkUserId = userInfo.user?.user_id

    if (!vkUserId) {
      console.error('VK link user_info error:', userInfo)
      res.redirect(`${FRONTEND_URL}/settings?vk=error`)
      return
    }

    const vkId = String(vkUserId)

    // Check if this vkId is already linked to a different user
    const existing = await prisma.user.findUnique({ where: { vkId } })
    if (existing && existing.id !== entry.userId) {
      res.redirect(`${FRONTEND_URL}/settings?vk=already_used`)
      return
    }

    await prisma.user.update({ where: { id: entry.userId }, data: { vkId } })
    res.redirect(`${FRONTEND_URL}/settings?vk=linked`)
  } catch (e) {
    console.error(e)
    res.redirect(`${FRONTEND_URL}/settings?vk=error`)
  }
})

/**
 * DELETE /api/vk/unlink
 * Requires auth. Removes vkId from the current user.
 */
router.delete('/unlink', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.user!.userId }, data: { vkId: null } })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка при отвязке VK' })
  }
})

export default router

import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'crypto'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma.js'
import { authenticate, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10,                   // не более 10 попыток с одного IP
  standardHeaders: true,     // отдавать RateLimit-* заголовки
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Повторите через 15 минут.' },
  skip: () => process.env.NODE_ENV !== 'production',
})

// PKCE helpers
function generateCodeVerifier() { return randomBytes(32).toString('base64url') }
function generateCodeChallenge(v: string) { return createHash('sha256').update(v).digest('base64url') }

// In-memory store for VK login state tokens (state → { codeVerifier, expires })
const loginStates = new Map<string, { codeVerifier: string; expires: number }>()

// One-time auth codes issued after VK callback (code → { token, expires })
// Replaces putting the JWT directly in the redirect URL
const authCodes = new Map<string, { token: string; expires: number }>()

// Strip sensitive fields before sending user to client
function safeUser(user: Record<string, unknown>) {
  const { passwordHash, mustChangePassword, ...rest } = user
  return { ...rest, mustChangePassword }
}

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response: { token: string, user: User, mustChangePassword: boolean }
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) { res.status(400).json({ error: 'Email и пароль обязательны' }); return }

    const trimmedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (!user) { res.status(401).json({ error: 'Неверный email или пароль' }); return }
    if (!user.isActive) { res.status(403).json({ error: 'Учётная запись заблокирована' }); return }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) { res.status(401).json({ error: 'Неверный email или пароль' }); return }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date().toISOString() } })

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: safeUser(user as unknown as Record<string, unknown>) })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 * Requires: authenticate
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
    if (!newPassword) {
      res.status(400).json({ error: 'Новый пароль обязателен' }); return
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Новый пароль должен содержать не менее 8 символов' }); return
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    // Skip current password check if user is forced to change on first login
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Текущий пароль обязателен' }); return
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) { res.status(401).json({ error: 'Неверный текущий пароль' }); return }
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    })

    res.json({ ok: true })
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }
    res.json(safeUser(user as unknown as Record<string, unknown>))
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

/**
 * GET /api/auth/vk
 * Redirects to VK ID OAuth 2.0 authorization page (new VK ID system)
 */
router.get('/vk', (_req: Request, res: Response) => {
  const { VK_CLIENT_ID, VK_REDIRECT_URI_LOGIN } = process.env
  if (!VK_CLIENT_ID || !VK_REDIRECT_URI_LOGIN) {
    res.status(500).json({ error: 'VK OAuth не настроен (VK_CLIENT_ID / VK_REDIRECT_URI_LOGIN)' })
    return
  }
  const codeVerifier = generateCodeVerifier()
  const state = randomBytes(16).toString('hex')
  loginStates.set(state, { codeVerifier, expires: Date.now() + 5 * 60 * 1000 })
  const params = new URLSearchParams({
    client_id: VK_CLIENT_ID,
    redirect_uri: VK_REDIRECT_URI_LOGIN,
    response_type: 'code',
    state,
    code_challenge: generateCodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  })
  res.redirect(`https://id.vk.com/authorize?${params}`)
})

/**
 * GET /api/auth/vk/callback
 * VK ID redirects here with ?code= after user authorizes
 * Finds user by vkId, issues JWT, redirects to frontend
 */
router.get('/vk/callback', async (req: Request, res: Response) => {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const { code, state, device_id } = req.query as { code?: string; state?: string; device_id?: string }

  if (!code) {
    res.redirect(`${FRONTEND_URL}/login?vk_error=no_code`)
    return
  }

  const loginEntry = state ? loginStates.get(state) : null
  if (!loginEntry || loginEntry.expires < Date.now()) {
    res.redirect(`${FRONTEND_URL}/login?vk_error=state_expired`)
    return
  }
  loginStates.delete(state!)

  try {
    const { VK_CLIENT_ID, VK_CLIENT_SECRET, VK_REDIRECT_URI_LOGIN } = process.env
    if (!VK_CLIENT_ID || !VK_CLIENT_SECRET || !VK_REDIRECT_URI_LOGIN) {
      res.redirect(`${FRONTEND_URL}/login?vk_error=not_configured`)
      return
    }

    // Exchange authorization code for access_token (VK ID OAuth 2.0 + PKCE)
    const tokenBody: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: VK_CLIENT_ID,
      client_secret: VK_CLIENT_SECRET,
      redirect_uri: VK_REDIRECT_URI_LOGIN,
      code,
      code_verifier: loginEntry.codeVerifier,
    }
    if (device_id) tokenBody.device_id = device_id
    const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenBody),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string }

    if (tokenData.error || !tokenData.access_token) {
      console.error('VK token error:', tokenData)
      res.redirect(`${FRONTEND_URL}/login?vk_error=token_failed`)
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
      console.error('VK user_info error:', userInfo)
      res.redirect(`${FRONTEND_URL}/login?vk_error=token_failed`)
      return
    }

    const vkId = String(vkUserId)

    // Find user by vkId
    const user = await prisma.user.findUnique({ where: { vkId } })
    if (!user) {
      res.redirect(`${FRONTEND_URL}/login?vk_error=not_linked`)
      return
    }
    if (!user.isActive) {
      res.redirect(`${FRONTEND_URL}/login?vk_error=blocked`)
      return
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date().toISOString() } })
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    // Безопасная передача токена: одноразовый код вместо JWT в URL
    const authCode = randomBytes(16).toString('hex')
    authCodes.set(authCode, { token, expires: Date.now() + 60_000 }) // TTL: 60 секунд
    res.redirect(`${FRONTEND_URL}/auth/vk?code=${authCode}`)
  } catch (e) {
    console.error(e)
    res.redirect(`${FRONTEND_URL}/login?vk_error=server_error`)
  }
})

/**
 * GET /api/auth/vk/exchange?code=xxx
 * Обменивает одноразовый код на JWT-токен.
 * Код действителен 60 секунд и уничтожается после первого использования.
 */
router.get('/vk/exchange', (req: Request, res: Response) => {
  const { code } = req.query as { code?: string }
  if (!code) { res.status(400).json({ error: 'Код не указан' }); return }

  const entry = authCodes.get(code)
  authCodes.delete(code) // удаляем сразу — одноразовый

  if (!entry || entry.expires < Date.now()) {
    res.status(401).json({ error: 'Код недействителен или истёк' }); return
  }

  res.json({ token: entry.token })
})

export default router

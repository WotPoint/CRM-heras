import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { authenticate, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

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
router.post('/login', async (req: Request, res: Response) => {
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

export default router

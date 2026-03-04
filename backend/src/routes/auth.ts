import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate, JWT_SECRET } from '../middleware/auth.js'

const router = Router()
const MOCK_PASSWORD = process.env.MOCK_PASSWORD ?? '123456'

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response: { token: string, user: User }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) { res.status(400).json({ error: 'Email и пароль обязательны' }); return }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || password !== MOCK_PASSWORD) { res.status(401).json({ error: 'Неверный email или пароль' }); return }
    if (!user.isActive) { res.status(403).json({ error: 'Учётная запись заблокирована' }); return }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date().toISOString() } })

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user })
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
    res.json(user)
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

export default router

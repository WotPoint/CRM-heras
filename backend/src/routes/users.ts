import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'

const router = Router()

router.use(authenticate)

/**
 * GET /api/users  (admin + supervisor)
 */
router.get('/', requireRole('admin', 'supervisor'), async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.user.findMany({ orderBy: { createdAt: 'asc' } }))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/users/:id  (admin + supervisor)
 */
router.get('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }
    res.json(user)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/users  (admin only)
 * Body: { name, email, role, phone?, isActive?, supervisorId? }
 */
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, email, role, phone, isActive, supervisorId } = req.body as Record<string, string | boolean | undefined>
    if (!name || !email || !role) { res.status(400).json({ error: 'name, email, role — обязательные поля' }); return }

    const existing = await prisma.user.findUnique({ where: { email: email as string } })
    if (existing) { res.status(409).json({ error: 'Email уже используется' }); return }

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: name as string,
        email: email as string,
        role: role as string,
        phone: phone as string | undefined,
        isActive: isActive !== false,
        supervisorId: supervisorId as string | undefined,
        createdAt: new Date().toISOString(),
      },
    })
    res.status(201).json(user)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * PATCH /api/users/:id  (admin only)
 */
router.patch('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    // Strip immutable fields
    const { id: _id, createdAt: _ca, ...data } = req.body
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    res.json(user)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * DELETE /api/users/:id — block user (isActive=false)  (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ message: 'Пользователь заблокирован', user })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

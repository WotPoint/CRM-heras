import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.use(authenticate)

const VALID_ROLES = ['manager', 'supervisor', 'admin']

function safeUser(u: Record<string, unknown>) {
  const { passwordHash: _ph, ...rest } = u
  return rest
}

/**
 * GET /api/users
 * admin/supervisor — all users; manager — active users only (for dropdowns)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role } = req.user!
    const where = (role === 'admin' || role === 'supervisor') ? {} : { isActive: true }
    const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'asc' } })
    res.json(users.map((u) => safeUser(u as unknown as Record<string, unknown>)))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/users/:id  (admin + supervisor)
 */
router.get('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }
    res.json(safeUser(user as unknown as Record<string, unknown>))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/users  (admin only)
 * Body: { name, email, role, password, phone?, isActive?, supervisorId? }
 */
router.post(
  '/',
  requireRole('admin'),
  validate({
    name:     { required: true, type: 'string', maxLength: 100, trim: true },
    email:    { required: true, isEmail: true, trim: true },
    role:     { required: true, enum: VALID_ROLES },
    password: { required: true, minLength: 8 },
  }),
  async (req: Request, res: Response) => {
    try {
      const { name, email, role, password, phone, isActive, supervisorId } = req.body as Record<string, string | boolean | undefined>

      const existing = await prisma.user.findUnique({ where: { email: (email as string).toLowerCase() } })
      if (existing) { res.status(409).json({ error: 'Email уже используется' }); return }

      const passwordHash = await bcrypt.hash(password as string, 10)
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          name: name as string,
          email: (email as string).toLowerCase(),
          role: role as string,
          phone: phone as string | undefined,
          isActive: isActive !== false,
          passwordHash,
          mustChangePassword: true,
          supervisorId: supervisorId as string | undefined,
          createdAt: new Date().toISOString(),
        },
      })
      res.status(201).json(safeUser(user as unknown as Record<string, unknown>))
    } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * PATCH /api/users/:id  (admin only)
 */
router.patch(
  '/:id',
  requireRole('admin'),
  validate({
    name:  { type: 'string', maxLength: 100, trim: true },
    email: { isEmail: true, trim: true },
    role:  { enum: VALID_ROLES },
    password: { minLength: 8 },
  }),
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!existing) { res.status(404).json({ error: 'Пользователь не найден' }); return }

      const { id: _id, createdAt: _ca, password, ...data } = req.body
      if (password) {
        data.passwordHash = await bcrypt.hash(password, 10)
      }
      const user = await prisma.user.update({ where: { id: req.params.id }, data })
      res.json(safeUser(user as unknown as Record<string, unknown>))
    } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * DELETE /api/users/:id — block user (isActive=false)  (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ message: 'Пользователь заблокирован', user: safeUser(user as unknown as Record<string, unknown>) })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

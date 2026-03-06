import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { canView, ownerFilter } from '../lib/helpers.js'
import { validate } from '../middleware/validate.js'

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'status_change']

const router = Router()

router.use(authenticate)

/**
 * GET /api/activities
 * Query: ?type=&clientId=&dealId=&managerId=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { type, clientId, dealId, managerId } = req.query as Record<string, string>

    const list = await prisma.activity.findMany({
      where: {
        ...ownerFilter(role, userId, 'managerId'),
        ...(type ? { type } : {}),
        ...(clientId ? { clientId } : {}),
        ...(dealId ? { dealId } : {}),
        ...(managerId ? { managerId } : {}),
      },
      orderBy: { date: 'desc' },
    })
    res.json(list)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/activities/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } })
    if (!activity) { res.status(404).json({ error: 'Активность не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, activity.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }
    res.json(activity)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/activities
 */
router.post(
  '/',
  validate({
    type:        { required: true, enum: ACTIVITY_TYPES },
    description: { required: true, type: 'string', maxLength: 1000, trim: true },
    date:        { required: true, isIso: true },
    result:      { type: 'string', maxLength: 500, trim: true },
  }),
  async (req: Request, res: Response) => {
    try {
      const { type, managerId, clientId, dealId, date, description, result } = req.body

      const activity = await prisma.activity.create({
        data: {
          id: uuidv4(),
          type,
          managerId: managerId ?? req.user!.userId,
          clientId,
          dealId,
          date,
          description,
          result,
          createdAt: new Date().toISOString(),
        },
      })
      res.status(201).json(activity)
    } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * PATCH /api/activities/:id
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Активность не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, existing.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    const { id: _id, createdAt: _ca, ...data } = req.body
    const activity = await prisma.activity.update({ where: { id: req.params.id }, data })
    res.json(activity)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * DELETE /api/activities/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Активность не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, existing.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    await prisma.activity.delete({ where: { id: req.params.id } })
    res.json({ message: 'Активность удалена', activity: existing })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

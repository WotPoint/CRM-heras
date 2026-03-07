import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { canView, ownerFilter } from '../lib/helpers.js'
import { validate } from '../middleware/validate.js'
import { sendNotification } from '../lib/notifications.js'

const DEAL_STATUSES = ['new', 'negotiation', 'proposal_sent', 'awaiting_payment', 'won', 'lost']

const router = Router()

router.use(authenticate)

/**
 * GET /api/deals
 * Query: ?status=&managerId=&clientId=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { status, managerId, clientId } = req.query as Record<string, string>

    const deals = await prisma.deal.findMany({
      where: {
        ...ownerFilter(role, userId),
        ...(status ? { status } : {}),
        ...(managerId ? { managerId } : {}),
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(deals)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/deals/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!deal) { res.status(404).json({ error: 'Сделка не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, deal.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }
    res.json(deal)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/deals/:id/history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!deal) { res.status(404).json({ error: 'Сделка не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, deal.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    const history = await prisma.dealStatusChange.findMany({
      where: { dealId: req.params.id },
      orderBy: { changedAt: 'asc' },
    })
    res.json(history)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/deals
 */
router.post(
  '/',
  validate({
    title:    { required: true, type: 'string', maxLength: 200, trim: true },
    clientId: { required: true, type: 'string' },
    amount:   { type: 'number', min: 0 },
    deadline: { isIso: true },
    status:   { enum: DEAL_STATUSES },
  }),
  async (req: Request, res: Response) => {
  try {
    const { title, clientId, managerId, status, amount, deadline, description } = req.body

    const now = new Date().toISOString()
    const dealStatus = status ?? 'new'
    const assignedManagerId = managerId ?? req.user!.userId

    const deal = await prisma.deal.create({
      data: { id: uuidv4(), title, clientId, managerId: assignedManagerId, status: dealStatus, amount: amount ?? 0, deadline, description, createdAt: now, updatedAt: now },
    })

    // Record initial status change
    await prisma.dealStatusChange.create({
      data: { id: uuidv4(), dealId: deal.id, fromStatus: null, toStatus: dealStatus, changedBy: req.user!.userId, changedAt: now },
    })

    res.status(201).json(deal)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * PATCH /api/deals/:id
 * Tracks status changes automatically
 */
router.patch(
  '/:id',
  validate({
    title:    { type: 'string', maxLength: 200, trim: true },
    amount:   { type: 'number', min: 0 },
    deadline: { isIso: true },
    status:   { enum: DEAL_STATUSES },
  }),
  async (req: Request, res: Response) => {
  try {
    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Сделка не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, existing.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    const { id: _id, createdAt: _ca, ...data } = req.body
    const now = new Date().toISOString()
    const deal = await prisma.deal.update({ where: { id: req.params.id }, data: { ...data, updatedAt: now } })

    // Record status change if status changed
    if (data.status && data.status !== existing.status) {
      await prisma.dealStatusChange.create({
        data: { id: uuidv4(), dealId: deal.id, fromStatus: existing.status, toStatus: data.status, changedBy: req.user!.userId, changedAt: now },
      })

      sendNotification('deal_status_changed', {
        dealId: deal.id,
        managerId: deal.managerId,
        fromStatus: existing.status,
        toStatus: data.status,
        title: deal.title,
      }).catch(err => console.error('[notification] deal_status_changed failed:', err))
    }
    res.json(deal)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * DELETE /api/deals/:id  (supervisor + admin only)
 */
router.delete('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Сделка не найдена' }); return }

    // Cascade: remove status changes first (SQLite has no cascade by default)
    await prisma.dealStatusChange.deleteMany({ where: { dealId: req.params.id } })
    await prisma.deal.delete({ where: { id: req.params.id } })
    res.json({ message: 'Сделка удалена', deal: existing })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { ownerFilter } from '../lib/helpers.js'

const router = Router()

router.use(authenticate)

/**
 * GET /api/calendar?from=ISO&to=ISO
 * Returns tasks (by deadline) + activities (by date) in the date range.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { from, to } = req.query as { from?: string; to?: string }

    const fromMs = from ? new Date(from).getTime() : 0
    const toMs = to ? new Date(to).getTime() : Infinity

    const inRange = (d?: string | null) => {
      if (!d) return false
      const ms = new Date(d).getTime()
      return ms >= fromMs && ms <= toMs
    }

    const [tasks, activities] = await Promise.all([
      prisma.task.findMany({ where: ownerFilter(role, userId, 'assigneeId') }),
      prisma.activity.findMany({ where: ownerFilter(role, userId, 'managerId') }),
    ])

    const taskEvents = tasks
      .filter((t) => inRange(t.deadline))
      .map((t) => ({ id: t.id, kind: 'task' as const, title: t.title, date: t.deadline!, priority: t.priority, status: t.status, assigneeId: t.assigneeId, clientId: t.clientId, dealId: t.dealId }))

    const activityEvents = activities
      .filter((a) => inRange(a.date))
      .map((a) => ({ id: a.id, kind: 'activity' as const, title: a.description, date: a.date, type: a.type, managerId: a.managerId, clientId: a.clientId, dealId: a.dealId }))

    const events = [...taskEvents, ...activityEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    res.json(events)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

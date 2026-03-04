import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('supervisor', 'admin'))

/**
 * GET /api/reports/managers
 */
router.get('/managers', async (_req: Request, res: Response) => {
  try {
    const managers = await prisma.user.findMany({ where: { role: 'manager' } })

    const stats = await Promise.all(
      managers.map(async (m) => {
        const [clients, deals, activities, tasks] = await Promise.all([
          prisma.client.count({ where: { managerId: m.id } }),
          prisma.deal.findMany({ where: { managerId: m.id } }),
          prisma.activity.count({ where: { managerId: m.id } }),
          prisma.task.findMany({ where: { assigneeId: m.id } }),
        ])
        const wonDeals = deals.filter((d) => d.status === 'won')
        return {
          manager: { id: m.id, name: m.name, email: m.email },
          clientsCount: clients,
          dealsCount: deals.length,
          wonDealsCount: wonDeals.length,
          wonAmount: wonDeals.reduce((s, d) => s + d.amount, 0),
          activitiesCount: activities,
          tasksCount: tasks.length,
          tasksDoneCount: tasks.filter((t) => t.status === 'done').length,
        }
      })
    )
    res.json(stats)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/reports/funnel
 */
router.get('/funnel', async (_req: Request, res: Response) => {
  try {
    const statuses = ['new', 'negotiation', 'proposal_sent', 'awaiting_payment', 'won', 'lost'] as const
    const funnel = await Promise.all(
      statuses.map(async (status) => {
        const deals = await prisma.deal.findMany({ where: { status } })
        return { status, count: deals.length, totalAmount: deals.reduce((s, d) => s + d.amount, 0) }
      })
    )
    res.json(funnel)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/reports/clients
 */
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany()
    const byStatus: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    for (const c of clients) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
      if (c.source) bySource[c.source] = (bySource[c.source] ?? 0) + 1
    }
    res.json({ byStatus, bySource, total: clients.length })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/reports/activities
 */
router.get('/activities', async (_req: Request, res: Response) => {
  try {
    const [activities, users] = await Promise.all([
      prisma.activity.findMany(),
      prisma.user.findMany(),
    ])
    const byType: Record<string, number> = {}
    const byManager: Record<string, { name: string; count: number }> = {}

    for (const a of activities) {
      byType[a.type] = (byType[a.type] ?? 0) + 1
      const manager = users.find((u) => u.id === a.managerId)
      if (manager) {
        if (!byManager[manager.id]) byManager[manager.id] = { name: manager.name, count: 0 }
        byManager[manager.id].count++
      }
    }
    res.json({ byType, byManager, total: activities.length })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

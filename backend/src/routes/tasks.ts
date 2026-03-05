import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { canView, ownerFilter } from '../lib/helpers.js'

const router = Router()

router.use(authenticate)

/**
 * GET /api/tasks
 * Query: ?status=&priority=&assigneeId=&clientId=&dealId=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { status, priority, assigneeId, clientId, dealId } = req.query as Record<string, string>

    const list = await prisma.task.findMany({
      where: {
        ...ownerFilter(role, userId, 'assigneeId'),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(dealId ? { dealId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(list)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/tasks/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!task) { res.status(404).json({ error: 'Задача не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, task.assigneeId)) { res.status(403).json({ error: 'Нет доступа' }); return }
    res.json(task)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/tasks
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, status, priority, assigneeId, clientId, dealId, deadline } = req.body
    if (!title) { res.status(400).json({ error: 'title — обязательное поле' }); return }

    const task = await prisma.task.create({
      data: {
        id: uuidv4(),
        title,
        description,
        status: status ?? 'new',
        priority: priority ?? 'medium',
        assigneeId: assigneeId ?? req.user!.userId,
        clientId,
        dealId,
        deadline,
        createdAt: new Date().toISOString(),
      },
    })
    res.status(201).json(task)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * PATCH /api/tasks/:id
 * Auto-sets completedAt when status → 'done', clears it when reopened
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }
    if (!canView(req.user!.role, req.user!.userId, existing.assigneeId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    const { id: _id, createdAt: _ca, ...data } = req.body

    if (data.status === 'done' && existing.status !== 'done') data.completedAt = new Date().toISOString()
    if (data.status && data.status !== 'done') data.completedAt = null

    const task = await prisma.task.update({ where: { id: req.params.id }, data })
    res.json(task)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * DELETE /api/tasks/:id  (supervisor + admin only)
 */
router.delete('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }

    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ message: 'Задача удалена' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

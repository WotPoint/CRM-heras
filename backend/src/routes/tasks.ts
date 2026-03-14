import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { canView, ownerFilter } from '../lib/helpers.js'
import { validate } from '../middleware/validate.js'
import { sendNotification } from '../lib/notifications.js'
import { logger } from '../lib/logger.js'

const TASK_STATUSES = ['new', 'in_progress', 'done']
const TASK_PRIORITIES = ['low', 'medium', 'high']

const router = Router()

router.use(authenticate)

/**
 * GET /api/tasks/archived  (supervisor + admin only)
 * Returns only archived tasks (isArchived=true)
 */
router.get('/archived', requireRole('admin', 'supervisor'), async (_req: Request, res: Response) => {
  try {
    const list = await prisma.task.findMany({
      where: { isArchived: true },
      orderBy: { archivedAt: 'desc' },
    })
    res.json(list)
  } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/tasks
 * Query: ?status=&priority=&assigneeId=&clientId=&dealId=
 * Only non-archived tasks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { status, priority, assigneeId, clientId, dealId } = req.query as Record<string, string>

    const list = await prisma.task.findMany({
      where: {
        isArchived: false,
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
  } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
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
  } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/tasks
 */
router.post(
  '/',
  validate({
    title:    { required: true, type: 'string', maxLength: 200, trim: true },
    priority: { enum: TASK_PRIORITIES },
    status:   { enum: TASK_STATUSES },
    deadline: { isIso: true },
  }),
  async (req: Request, res: Response) => {
    try {
      const { title, description, status, priority, assigneeId, clientId, dealId, deadline } = req.body

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
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
      })

      logger.info('task.created', { userId: req.user!.userId, taskId: task.id, assigneeId: task.assigneeId, priority: task.priority })

      sendNotification('task_assigned', {
        taskId: task.id,
        assigneeId: task.assigneeId,
        title: task.title,
        deadline: task.deadline,
        clientId: task.clientId,
      }).catch(err => logger.error('notification.failed', { event: 'task_assigned', message: (err as Error).message }))

      res.status(201).json(task)
    } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * PATCH /api/tasks/:id
 * Auto-sets completedAt when status → 'done', clears it when reopened
 */
router.patch(
  '/:id',
  validate({
    title:    { type: 'string', maxLength: 200, trim: true },
    priority: { enum: TASK_PRIORITIES },
    status:   { enum: TASK_STATUSES },
    deadline: { isIso: true },
  }),
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
      if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }
      if (!canView(req.user!.role, req.user!.userId, existing.assigneeId)) { res.status(403).json({ error: 'Нет доступа' }); return }

      const { id: _id, createdAt: _ca, ...data } = req.body

      if (data.status === 'done' && existing.status !== 'done') {
        data.completedAt = new Date().toISOString()
        logger.info('task.completed', { userId: req.user!.userId, taskId: existing.id, assigneeId: existing.assigneeId })
      }
      if (data.status && data.status !== 'done') data.completedAt = null

      const task = await prisma.task.update({ where: { id: req.params.id }, data })
      res.json(task)
    } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
  }
)

/**
 * PATCH /api/tasks/:id/archive  (supervisor + admin only)
 */
router.patch('/:id/archive', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }
    if (existing.isArchived) { res.status(400).json({ error: 'Задача уже в архиве' }); return }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { isArchived: true, archivedAt: new Date().toISOString() },
    })
    logger.info('task.archived', { userId: req.user!.userId, taskId: req.params.id })
    res.json(task)
  } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * DELETE /api/tasks/:id  (supervisor + admin only)
 */
router.delete('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }

    await prisma.task.delete({ where: { id: req.params.id } })
    logger.info('task.deleted', { userId: req.user!.userId, taskId: req.params.id })
    res.json({ message: 'Задача удалена' })
  } catch (e) { logger.error('tasks.error', { message: (e as Error).message, stack: (e as Error).stack }); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

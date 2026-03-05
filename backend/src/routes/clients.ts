import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { canView, ownerFilter, fmtClient, serializeTags } from '../lib/helpers.js'

const router = Router()

router.use(authenticate)

/**
 * GET /api/clients
 * Query: ?status=&managerId=&search=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!
    const { status, managerId, search } = req.query as Record<string, string>

    const rows = await prisma.client.findMany({
      where: {
        ...ownerFilter(role, userId),
        ...(status ? { status } : {}),
        ...(managerId ? { managerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    let list = rows.map(fmtClient)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      )
    }

    res.json(list)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * GET /api/clients/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const row = await prisma.client.findUnique({ where: { id: req.params.id } })
    if (!row) { res.status(404).json({ error: 'Клиент не найден' }); return }
    if (!canView(req.user!.role, req.user!.userId, row.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }
    res.json(fmtClient(row as Record<string, unknown>))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * POST /api/clients
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, company, email, phone, address, status, managerId, tags, source, comment } = req.body
    if (!firstName || !lastName) { res.status(400).json({ error: 'firstName и lastName — обязательные поля' }); return }

    const row = await prisma.client.create({
      data: {
        id: uuidv4(),
        firstName,
        lastName,
        company,
        email,
        phone,
        address,
        status: status ?? 'lead',
        managerId: managerId ?? req.user!.userId,
        tags: serializeTags(tags),
        source,
        comment,
        createdAt: new Date().toISOString(),
      },
    })
    res.status(201).json(fmtClient(row as Record<string, unknown>))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * PATCH /api/clients/:id
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const row = await prisma.client.findUnique({ where: { id: req.params.id } })
    if (!row) { res.status(404).json({ error: 'Клиент не найден' }); return }
    if (!canView(req.user!.role, req.user!.userId, row.managerId)) { res.status(403).json({ error: 'Нет доступа' }); return }

    const { id: _id, createdAt: _ca, tags, ...rest } = req.body
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: { ...rest, ...(tags !== undefined ? { tags: serializeTags(tags) } : {}) },
    })
    res.json(fmtClient(updated as Record<string, unknown>))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

/**
 * DELETE /api/clients/:id  (supervisor + admin only)
 */
router.delete('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const row = await prisma.client.findUnique({ where: { id: req.params.id } })
    if (!row) { res.status(404).json({ error: 'Клиент не найден' }); return }

    await prisma.client.delete({ where: { id: req.params.id } })
    res.json({ message: 'Клиент удалён' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Внутренняя ошибка сервера' }) }
})

export default router

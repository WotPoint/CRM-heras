import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../lib/prisma.js', () => ({
  default: {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// sendNotification вызывается fire-and-forget — мокируем чтобы не падало
vi.mock('../lib/notifications.js', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../lib/prisma.js'
import tasksRouter from '../routes/tasks.js'

const SECRET = process.env.JWT_SECRET!

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', tasksRouter)
  return app
}

const app = createApp()

function token(role: 'manager' | 'supervisor' | 'admin', userId = 'u1') {
  return jwt.sign({ userId, role }, SECRET)
}

const mockTask = {
  id: 't1',
  title: 'Позвонить клиенту',
  description: null,
  status: 'new',
  priority: 'medium',
  assigneeId: 'u1',
  clientId: null,
  dealId: null,
  deadline: null,
  isArchived: false,
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  completedAt: null,
}

// ─────────────────────────────────────────────
// GET /api/tasks — список
// ─────────────────────────────────────────────
describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.mocked(prisma.task.findMany).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(401)
  })

  it('возвращает список задач для менеджера', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask] as never)
    const res = await request(app).get('/').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].id).toBe('t1')
  })

  it('возвращает пустой массив если задач нет', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([] as never)
    const res = await request(app).get('/').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─────────────────────────────────────────────
// GET /api/tasks/:id
// ─────────────────────────────────────────────
describe('GET /api/tasks/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.task.findUnique).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/t1')
    expect(res.status).toBe(401)
  })

  it('возвращает 404 если задача не найдена', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/t999').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Задача не найдена')
  })

  it('возвращает 403 если менеджер обращается к чужой задаче', async () => {
    // задача назначена u2, а токен выдан для u1
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ ...mockTask, assigneeId: 'u2' } as never)
    const res = await request(app).get('/t1').set('Authorization', `Bearer ${token('manager', 'u1')}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Нет доступа')
  })

  it('возвращает задачу назначенному исполнителю', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    const res = await request(app).get('/t1').set('Authorization', `Bearer ${token('manager', 'u1')}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('t1')
  })

  it('supervisor видит чужую задачу', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ ...mockTask, assigneeId: 'u1' } as never)
    const res = await request(app).get('/t1').set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────
// POST /api/tasks
// ─────────────────────────────────────────────
describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.mocked(prisma.task.create).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).post('/').send({ title: 'Тест' })
    expect(res.status).toBe(401)
  })

  it('возвращает 400 если title отсутствует', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ priority: 'high' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('"title"')
  })

  it('возвращает 400 если priority не входит в допустимые значения', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ title: 'Задача', priority: 'critical' })
    expect(res.status).toBe(400)
  })

  it('возвращает 400 если status не входит в допустимые значения', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ title: 'Задача', status: 'pending' })
    expect(res.status).toBe(400)
  })

  it('возвращает 400 если deadline не в формате ISO', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ title: 'Задача', deadline: '01.01.2025' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ISO')
  })

  it('создаёт задачу и возвращает 201', async () => {
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask as never)
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ title: 'Позвонить клиенту', priority: 'medium' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('t1')
    expect(res.body.title).toBe('Позвонить клиенту')
  })

  it('создаёт задачу с дедлайном в формате ISO', async () => {
    const taskWithDeadline = { ...mockTask, deadline: '2025-12-31' }
    vi.mocked(prisma.task.create).mockResolvedValue(taskWithDeadline as never)
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ title: 'Срочная задача', deadline: '2025-12-31' })
    expect(res.status).toBe(201)
  })
})

// ─────────────────────────────────────────────
// DELETE /api/tasks/:id
// ─────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.task.findUnique).mockReset()
    vi.mocked(prisma.task.delete).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).delete('/t1')
    expect(res.status).toBe(401)
  })

  it('возвращает 403 если роль — manager', async () => {
    const res = await request(app)
      .delete('/t1')
      .set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Недостаточно прав')
  })

  it('возвращает 404 если задача не найдена (supervisor)', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)
    const res = await request(app)
      .delete('/t999')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(404)
  })

  it('удаляет задачу и возвращает 200 (supervisor)', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as never)
    const res = await request(app)
      .delete('/t1')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Задача удалена')
  })

  it('удаляет задачу и возвращает 200 (admin)', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as never)
    const res = await request(app)
      .delete('/t1')
      .set('Authorization', `Bearer ${token('admin', 'u4')}`)
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────
// PATCH /api/tasks/:id/archive
// ─────────────────────────────────────────────
describe('PATCH /api/tasks/:id/archive', () => {
  beforeEach(() => {
    vi.mocked(prisma.task.findUnique).mockReset()
    vi.mocked(prisma.task.update).mockReset()
  })

  it('возвращает 403 если роль — manager', async () => {
    const res = await request(app)
      .patch('/t1/archive')
      .set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(403)
  })

  it('возвращает 400 если задача уже в архиве', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ ...mockTask, isArchived: true } as never)
    const res = await request(app)
      .patch('/t1/archive')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Задача уже в архиве')
  })

  it('архивирует задачу и возвращает 200', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, isArchived: true } as never)
    const res = await request(app)
      .patch('/t1/archive')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
    expect(res.body.isArchived).toBe(true)
  })
})

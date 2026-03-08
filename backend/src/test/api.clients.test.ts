import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../lib/prisma.js', () => ({
  default: {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '../lib/prisma.js'
import clientsRouter from '../routes/clients.js'

const SECRET = process.env.JWT_SECRET!

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', clientsRouter)
  return app
}

const app = createApp()

function token(role: 'manager' | 'supervisor' | 'admin', userId = 'u1') {
  return jwt.sign({ userId, role }, SECRET)
}

const mockClient = {
  id: 'c1',
  firstName: 'Иван',
  lastName: 'Петров',
  company: 'ООО Тест',
  email: 'ivan@test.ru',
  phone: null,
  address: null,
  status: 'active',
  managerId: 'u1',
  tags: '["vip"]',
  source: null,
  comment: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastContactAt: null,
}

// ─────────────────────────────────────────────
// GET /api/clients — список
// ─────────────────────────────────────────────
describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.mocked(prisma.client.findMany).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(401)
  })

  it('возвращает список клиентов для менеджера', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as never)
    const res = await request(app).get('/').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].id).toBe('c1')
    // теги должны быть распарсены из JSON-строки
    expect(res.body[0].tags).toEqual(['vip'])
  })

  it('возвращает список клиентов для supervisor', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as never)
    const res = await request(app).get('/').set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
  })

  it('возвращает пустой массив если клиентов нет', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([] as never)
    const res = await request(app).get('/').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─────────────────────────────────────────────
// GET /api/clients/:id
// ─────────────────────────────────────────────
describe('GET /api/clients/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.client.findUnique).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/c1')
    expect(res.status).toBe(401)
  })

  it('возвращает 404 если клиент не найден', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/c999').set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Клиент не найден')
  })

  it('возвращает 403 если менеджер обращается к чужому клиенту', async () => {
    // клиент принадлежит u2, а токен выдан для u1
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ ...mockClient, managerId: 'u2' } as never)
    const res = await request(app).get('/c1').set('Authorization', `Bearer ${token('manager', 'u1')}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Нет доступа')
  })

  it('возвращает клиента менеджеру — владельцу записи', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(mockClient as never)
    const res = await request(app).get('/c1').set('Authorization', `Bearer ${token('manager', 'u1')}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('c1')
  })

  it('supervisor видит чужого клиента', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ ...mockClient, managerId: 'u1' } as never)
    const res = await request(app).get('/c1').set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────
// POST /api/clients
// ─────────────────────────────────────────────
describe('POST /api/clients', () => {
  beforeEach(() => {
    vi.mocked(prisma.client.create).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).post('/').send({ firstName: 'Иван', lastName: 'Петров' })
    expect(res.status).toBe(401)
  })

  it('возвращает 400 если firstName отсутствует', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ lastName: 'Петров' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('"firstName"')
  })

  it('возвращает 400 если lastName отсутствует', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ firstName: 'Иван' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('"lastName"')
  })

  it('возвращает 400 при некорректном email', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ firstName: 'Иван', lastName: 'Петров', email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('"email"')
  })

  it('возвращает 400 при недопустимом статусе', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ firstName: 'Иван', lastName: 'Петров', status: 'unknown_status' })
    expect(res.status).toBe(400)
  })

  it('создаёт клиента и возвращает 201', async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(mockClient as never)
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token('manager')}`)
      .send({ firstName: 'Иван', lastName: 'Петров', email: 'ivan@test.ru' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('c1')
    expect(res.body.tags).toEqual(['vip'])
  })
})

// ─────────────────────────────────────────────
// DELETE /api/clients/:id
// ─────────────────────────────────────────────
describe('DELETE /api/clients/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.client.findUnique).mockReset()
    vi.mocked(prisma.client.delete).mockReset()
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).delete('/c1')
    expect(res.status).toBe(401)
  })

  it('возвращает 403 если роль — manager', async () => {
    const res = await request(app)
      .delete('/c1')
      .set('Authorization', `Bearer ${token('manager')}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Недостаточно прав')
  })

  it('возвращает 404 если клиент не найден (supervisor)', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
    const res = await request(app)
      .delete('/c999')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(404)
  })

  it('удаляет клиента и возвращает 200 (supervisor)', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(mockClient as never)
    vi.mocked(prisma.client.delete).mockResolvedValue(mockClient as never)
    const res = await request(app)
      .delete('/c1')
      .set('Authorization', `Bearer ${token('supervisor', 'u3')}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Клиент удалён')
  })

  it('удаляет клиента и возвращает 200 (admin)', async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(mockClient as never)
    vi.mocked(prisma.client.delete).mockResolvedValue(mockClient as never)
    const res = await request(app)
      .delete('/c1')
      .set('Authorization', `Bearer ${token('admin', 'u4')}`)
    expect(res.status).toBe(200)
  })
})

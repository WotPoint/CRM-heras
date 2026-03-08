import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

// ── Mocks (Vitest hoists these above imports) ──────────────────────────────
vi.mock('../lib/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('new-hashed-password'),
  },
}))

import prisma from '../lib/prisma.js'
import bcrypt from 'bcrypt'
import authRouter from '../routes/auth.js'

const SECRET = process.env.JWT_SECRET!

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', authRouter)
  return app
}

const mockUser = {
  id: 'u1',
  name: 'Анна Менеджерова',
  email: 'manager@crm.ru',
  role: 'manager',
  isActive: true,
  mustChangePassword: false,
  passwordHash: '$2b$10$mockhash',
  createdAt: '2024-01-01T00:00:00.000Z',
}

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
describe('POST /login', () => {
  const app = createApp()

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset()
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(bcrypt.compare).mockReset()
  })

  it('возвращает 400 если email не передан', async () => {
    const res = await request(app).post('/login').send({ password: '123456' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email и пароль обязательны')
  })

  it('возвращает 400 если пароль не передан', async () => {
    const res = await request(app).post('/login').send({ email: 'manager@crm.ru' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email и пароль обязательны')
  })

  it('возвращает 400 при пустом теле запроса', async () => {
    const res = await request(app).post('/login').send({})
    expect(res.status).toBe(400)
  })

  it('возвращает 401 если пользователь не найден', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await request(app).post('/login').send({ email: 'ghost@crm.ru', password: '123456' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Неверный email или пароль')
  })

  it('возвращает 403 если учётная запись заблокирована', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, isActive: false } as never)
    const res = await request(app).post('/login').send({ email: 'manager@crm.ru', password: '123456' })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Учётная запись заблокирована')
  })

  it('возвращает 401 при неверном пароле', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const res = await request(app).post('/login').send({ email: 'manager@crm.ru', password: 'wrongpassword' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Неверный email или пароль')
  })

  it('возвращает 200 с токеном и данными пользователя при верных данных', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = await request(app).post('/login').send({ email: 'manager@crm.ru', password: '123456' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('manager@crm.ru')
    // passwordHash не должен попасть в ответ
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('нормализует email к нижнему регистру при поиске', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    await request(app).post('/login').send({ email: '  MANAGER@CRM.RU  ', password: '123456' })
    expect(vi.mocked(prisma.user.findUnique)).toHaveBeenCalledWith({
      where: { email: 'manager@crm.ru' },
    })
  })
})

// ─────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────
describe('GET /me', () => {
  const app = createApp()

  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/me')
    expect(res.status).toBe(401)
  })

  it('возвращает 401 с невалидным токеном', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer bad.token.here')
    expect(res.status).toBe(401)
  })

  it('возвращает данные текущего пользователя с валидным токеном', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    const token = jwt.sign({ userId: 'u1', role: 'manager' }, SECRET)
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('u1')
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('возвращает 404 если пользователь удалён из БД', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const token = jwt.sign({ userId: 'u999', role: 'manager' }, SECRET)
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────
// POST /change-password
// ─────────────────────────────────────────────
describe('POST /change-password', () => {
  const app = createApp()

  const validToken = jwt.sign({ userId: 'u1', role: 'manager' }, SECRET)

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
  })

  it('возвращает 401 без токена', async () => {
    const res = await request(app).post('/change-password').send({ newPassword: 'newpass123' })
    expect(res.status).toBe(401)
  })

  it('возвращает 400 если новый пароль не передан', async () => {
    const res = await request(app)
      .post('/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: '123456' })
    expect(res.status).toBe(400)
  })

  it('возвращает 400 если новый пароль короче 8 символов', async () => {
    const res = await request(app)
      .post('/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: '123456', newPassword: 'short' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('8 символов')
  })

  it('возвращает 200 при успешной смене пароля', async () => {
    const res = await request(app)
      .post('/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: '123456', newPassword: 'newpassword123' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

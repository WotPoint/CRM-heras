import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth.js'

const SECRET = process.env.JWT_SECRET!

/** Минимальный мок объектов Express */
function makeReqRes(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request
  const json = vi.fn()
  const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as Response
  const next = vi.fn() as unknown as NextFunction
  // удобный доступ к статусу
  const status = (res.status as ReturnType<typeof vi.fn>)
  return { req, res, status, json, next }
}

function makeValidToken(payload = { userId: 'u1', role: 'manager' as const }) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' })
}

// ─────────────────────────────────────────────
// authenticate
// ─────────────────────────────────────────────
describe('authenticate', () => {
  it('вызывает next() для валидного токена', () => {
    const token = makeValidToken()
    const { req, res, next } = makeReqRes(`Bearer ${token}`)
    authenticate(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('записывает payload в req.user при валидном токене', () => {
    const token = makeValidToken({ userId: 'u2', role: 'supervisor' })
    const { req, res, next } = makeReqRes(`Bearer ${token}`)
    authenticate(req, res, next)
    expect(req.user?.userId).toBe('u2')
    expect(req.user?.role).toBe('supervisor')
  })

  it('возвращает 401 при отсутствии заголовка Authorization', () => {
    const { req, res, status, json, next } = makeReqRes(undefined)
    authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Токен не предоставлен' })
    expect(next).not.toHaveBeenCalled()
  })

  it('возвращает 401 если заголовок не начинается с "Bearer "', () => {
    const { req, res, status, json, next } = makeReqRes('Token abc123')
    authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Токен не предоставлен' })
  })

  it('возвращает 401 для токена подписанного другим секретом', () => {
    const fakeToken = jwt.sign({ userId: 'u1', role: 'admin' }, 'wrong-secret')
    const { req, res, status, json, next } = makeReqRes(`Bearer ${fakeToken}`)
    authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Недействительный или истёкший токен' })
    expect(next).not.toHaveBeenCalled()
  })

  it('возвращает 401 для истёкшего токена', () => {
    const expiredToken = jwt.sign({ userId: 'u1', role: 'manager' }, SECRET, { expiresIn: -1 })
    const { req, res, status, json, next } = makeReqRes(`Bearer ${expiredToken}`)
    authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Недействительный или истёкший токен' })
  })

  it('возвращает 401 для явно испорченного токена', () => {
    const { req, res, status, next } = makeReqRes('Bearer not.a.jwt.at.all')
    authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('корректно декодирует роль admin', () => {
    const token = makeValidToken({ userId: 'u4', role: 'admin' })
    const { req, res, next } = makeReqRes(`Bearer ${token}`)
    authenticate(req, res, next)
    expect(req.user?.role).toBe('admin')
  })
})

import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireRole } from '../middleware/role.js'
import type { JwtPayload } from '../types/index.js'

function makeCtx(user?: JwtPayload) {
  const req = { user } as unknown as Request
  const json = vi.fn()
  const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as Response
  const next = vi.fn() as unknown as NextFunction
  const status = (res.status as ReturnType<typeof vi.fn>)
  return { req, res, status, json, next }
}

// ─────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────
describe('requireRole', () => {
  it('вызывает next() если роль пользователя входит в разрешённые', () => {
    const { req, res, next } = makeCtx({ userId: 'u1', role: 'manager' })
    requireRole('manager')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('вызывает next() если передано несколько ролей и пользователь — supervisor', () => {
    const { req, res, next } = makeCtx({ userId: 'u3', role: 'supervisor' })
    requireRole('supervisor', 'admin')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('вызывает next() если передано несколько ролей и пользователь — admin', () => {
    const { req, res, next } = makeCtx({ userId: 'u4', role: 'admin' })
    requireRole('supervisor', 'admin')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('возвращает 403 если роль не входит в разрешённые', () => {
    const { req, res, status, json, next } = makeCtx({ userId: 'u1', role: 'manager' })
    requireRole('admin')(req, res, next)
    expect(status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ error: 'Недостаточно прав' })
    expect(next).not.toHaveBeenCalled()
  })

  it('возвращает 403 если менеджер пытается попасть в supervisor-маршрут', () => {
    const { req, res, status, next } = makeCtx({ userId: 'u1', role: 'manager' })
    requireRole('supervisor', 'admin')(req, res, next)
    expect(status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('возвращает 401 если req.user не задан (токен не прошёл authenticate)', () => {
    const { req, res, status, json, next } = makeCtx(undefined)
    requireRole('manager')(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Не авторизован' })
    expect(next).not.toHaveBeenCalled()
  })

  it('admin проходит маршрут, разрешённый только для admin', () => {
    const { req, res, next } = makeCtx({ userId: 'u4', role: 'admin' })
    requireRole('admin')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('возвращает функцию-middleware (фабрика)', () => {
    const middleware = requireRole('admin')
    expect(typeof middleware).toBe('function')
  })
})

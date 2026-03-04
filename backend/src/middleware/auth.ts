import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/index.js'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'crm-heras-secret-key-2024'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Токен не предоставлен' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Недействительный или истёкший токен' })
  }
}

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/index.js'

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET не задан в .env')
  process.exit(1)
}
export const JWT_SECRET = process.env.JWT_SECRET

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

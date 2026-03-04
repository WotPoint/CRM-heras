import { Request, Response, NextFunction } from 'express'
import type { UserRole } from '../types/index.js'

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Недостаточно прав' })
      return
    }
    next()
  }
}

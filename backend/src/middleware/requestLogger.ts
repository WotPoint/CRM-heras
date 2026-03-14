import { type Request, type Response, type NextFunction } from 'express'
import { logger } from '../lib/logger.js'

const LOGGED_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

/**
 * Logs all mutating HTTP requests (POST, PATCH, DELETE) as structured JSON.
 * Fires on response finish so status code and duration are available.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!LOGGED_METHODS.has(req.method)) { next(); return }

  const start = Date.now()

  res.on('finish', () => {
    logger.info('http_request', {
      method:      req.method,
      url:         req.originalUrl,
      status:      res.statusCode,
      durationMs:  Date.now() - start,
      userId:      req.user?.userId,
      ip:          req.ip,
    })
  })

  next()
}

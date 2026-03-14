import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import prisma from './lib/prisma.js'
import { logger } from './lib/logger.js'
import { requestLogger } from './middleware/requestLogger.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import clientsRouter from './routes/clients.js'
import dealsRouter from './routes/deals.js'
import activitiesRouter from './routes/activities.js'
import tasksRouter from './routes/tasks.js'
import calendarRouter from './routes/calendar.js'
import reportsRouter from './routes/reports.js'
import emailRouter from './routes/email.js'
import vkRouter from './routes/vk.js'
import { startDeadlineNotifier } from './jobs/deadlineNotifier.js'

const app = express()
// Amvera (и другие PaaS) стоят за reverse proxy — без этого express-rate-limit
// падает с ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1)
const PORT = process.env.PORT ?? 3001
const isProd = process.env.NODE_ENV === 'production'

// ESM не имеет __dirname — восстанавливаем через import.meta.url
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173']
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json())
app.use(requestLogger)

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/deals', dealsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/email', emailRouter)
app.use('/api/vk', vkRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', db: 'sqlite', timestamp: new Date().toISOString() }))

// В production раздаём собранный фронтенд
// backend/dist/index.js → ../../frontend/dist (от корня репозитория)
if (isProd) {
  const frontendDist = join(__dirname, '../../frontend/dist')
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    // SPA fallback: все немаршрутизированные URL отдают index.html
    app.get('*', (_req, res) => res.sendFile(join(frontendDist, 'index.html')))
  }
}

app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }))

// Глобальный обработчик ошибок — перехватывает всё, что не поймали роуты
// Возвращает только текст ошибки, без stack trace
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', { message: err.message, stack: err.stack, name: err.name })
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, async () => {
  await prisma.$connect()
  startDeadlineNotifier()
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV ?? 'development' })
  console.log(`\n🚀 CRM-heras backend: http://localhost:${PORT}`)
  console.log(`🗄️  База данных: SQLite (prisma/dev.db)`)
  console.log(`📋 Тест: открой backend/test.html\n`)
})

export default app

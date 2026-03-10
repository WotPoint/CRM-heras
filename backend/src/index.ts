import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import prisma from './lib/prisma.js'
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
const PORT = process.env.PORT ?? 3001

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

app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }))

// Глобальный обработчик ошибок — перехватывает всё, что не поймали роуты
// Возвращает только текст ошибки, без stack trace
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, async () => {
  await prisma.$connect()
  startDeadlineNotifier()
  console.log(`\n🚀 CRM-heras backend: http://localhost:${PORT}`)
  console.log(`🗄️  База данных: SQLite (prisma/dev.db)`)
  console.log(`📋 Тест: открой backend/test.html\n`)
})

export default app

import { type BotContext } from '../context.js'
import prisma from '../../lib/prisma.js'

const PRIORITY_EMOJI: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }

export async function handleTasks(ctx: BotContext): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } })

  if (!user) {
    await ctx.reply('❌ Аккаунт CRM не привязан.')
    return
  }

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { not: 'done' }, isArchived: false },
    orderBy: { deadline: 'asc' },
    take: 20,
  })

  if (tasks.length === 0) {
    await ctx.reply('✅ Нет активных задач!')
    return
  }

  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const weekEnd = new Date(todayEnd.getTime() + 6 * 24 * 60 * 60 * 1000)

  const overdue: typeof tasks = []
  const today: typeof tasks = []
  const week: typeof tasks = []
  const later: typeof tasks = []

  for (const t of tasks) {
    if (!t.deadline) { later.push(t); continue }
    const d = new Date(t.deadline)
    if (d < now) overdue.push(t)
    else if (d <= todayEnd) today.push(t)
    else if (d <= weekEnd) week.push(t)
    else later.push(t)
  }

  const fmt = (t: typeof tasks[0]) => {
    const dl = t.deadline ? new Date(t.deadline).toLocaleDateString('ru-RU') : '—'
    return `• ${PRIORITY_EMOJI[t.priority] ?? ''} ${t.title} [${dl}]`
  }

  const parts: string[] = ['📋 <b>Ваши активные задачи</b>\n']
  if (overdue.length) parts.push(`🔴 <b>Просрочено (${overdue.length})</b>\n${overdue.map(fmt).join('\n')}`)
  if (today.length) parts.push(`🟡 <b>Сегодня (${today.length})</b>\n${today.map(fmt).join('\n')}`)
  if (week.length) parts.push(`📅 <b>Эта неделя (${week.length})</b>\n${week.map(fmt).join('\n')}`)
  if (later.length) parts.push(`📌 <b>Позже (${later.length})</b>\n${later.map(fmt).join('\n')}`)

  await ctx.reply(parts.join('\n\n'), { parse_mode: 'HTML' })
}

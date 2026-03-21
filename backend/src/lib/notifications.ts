import prisma from './prisma.js'
import { sendEmail, GmailNotConnectedError } from './gmail.js'
import { sendTelegramMessage } from '../bot/notifications/sender.js'

export type NotificationEvent =
  | 'task_assigned'
  | 'task_deadline_approaching'
  | 'deal_status_changed'
  | 'activity_logged'
  | 'client_assigned'

interface TaskPayload {
  taskId: string
  assigneeId: string
  title: string
  deadline?: string | null
  clientId?: string | null
}

interface DealPayload {
  dealId: string
  managerId: string
  fromStatus: string
  toStatus: string
  title: string
}

interface ActivityPayload {
  activityId: string
  managerId: string
  type: string
  clientId?: string | null
  dealId?: string | null
}

interface ClientPayload {
  clientId: string
  managerId: string
  firstName: string
  lastName: string
  phone?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  negotiation: 'Переговоры',
  proposal_sent: 'КП отправлено',
  awaiting_payment: 'Ожидание оплаты',
  won: 'Выиграна',
  lost: 'Проиграна',
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Звонок',
  email: 'Email',
  meeting: 'Встреча',
  note: 'Заметка',
  status_change: 'Изменение статуса',
}

export async function sendNotification(
  event: NotificationEvent,
  payload: TaskPayload | DealPayload | ActivityPayload | ClientPayload
): Promise<void> {
  try {
    switch (event) {
      case 'task_assigned':
        await handleTaskAssigned(payload as TaskPayload)
        break
      case 'task_deadline_approaching':
        await handleDeadlineApproaching(payload as TaskPayload)
        break
      case 'deal_status_changed':
        await handleDealStatusChanged(payload as DealPayload)
        break
      case 'activity_logged':
        await handleActivityLogged(payload as ActivityPayload)
        break
      case 'client_assigned':
        await handleClientAssigned(payload as ClientPayload)
        break
    }
  } catch (err) {
    console.error(`[notifications] ${event} error:`, err)
  }
}

async function handleTaskAssigned(p: TaskPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.assigneeId } })
  if (!user) return

  const deadlineStr = p.deadline
    ? new Date(p.deadline).toLocaleDateString('ru-RU')
    : null

  // Email
  if (user.email && user.gmailRefreshToken) {
    const body = `Здравствуйте, ${user.name}!\n\nВам назначена новая задача в CRM:\n\nЗадача: ${p.title}\n${deadlineStr ? `Дедлайн: ${deadlineStr}` : 'Дедлайн не указан'}\n\nОткройте CRM для просмотра подробностей.`
    await safeSendEmail(p.assigneeId, { to: user.email, subject: `Новая задача: ${p.title}`, body })
  }

  // Telegram
  if (user.telegramChatId) {
    const dl = deadlineStr ? `\n📅 Дедлайн: ${deadlineStr}` : ''
    await sendTelegramMessage(user.telegramChatId, `📌 <b>Новая задача</b>\n\n<b>${p.title}</b>${dl}`)
  }
}

async function handleDeadlineApproaching(p: TaskPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.assigneeId } })
  if (!user) return

  const deadlineStr = p.deadline
    ? new Date(p.deadline).toLocaleDateString('ru-RU')
    : 'завтра'

  // Email
  if (user.email && user.gmailRefreshToken) {
    const body = `Здравствуйте, ${user.name}!\n\nНапоминаем, что завтра дедлайн задачи:\n\nЗадача: ${p.title}\nДедлайн: ${deadlineStr}\n\nОткройте CRM для просмотра подробностей.`
    await safeSendEmail(p.assigneeId, { to: user.email, subject: `Дедлайн завтра: ${p.title}`, body })
  }

  // Telegram
  if (user.telegramChatId) {
    await sendTelegramMessage(user.telegramChatId, `⏰ <b>Дедлайн завтра!</b>\n\n<b>${p.title}</b>\n📅 ${deadlineStr}`)
  }
}

async function handleDealStatusChanged(p: DealPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.managerId } })
  if (!user) return

  const from = STATUS_LABELS[p.fromStatus] ?? p.fromStatus
  const to = STATUS_LABELS[p.toStatus] ?? p.toStatus

  // Email
  if (user.email && user.gmailRefreshToken) {
    const body = `Здравствуйте, ${user.name}!\n\nСтатус сделки изменился:\n\nСделка: ${p.title}\n${from} → ${to}\n\nОткройте CRM для просмотра подробностей.`
    await safeSendEmail(p.managerId, { to: user.email, subject: `Сделка изменила статус: ${p.title}`, body })
  }

  // Telegram
  if (user.telegramChatId) {
    await sendTelegramMessage(user.telegramChatId, `🔄 <b>Статус сделки изменён</b>\n\n<b>${p.title}</b>\n${from} → ${to}`)
  }
}

async function handleActivityLogged(p: ActivityPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.managerId } })
  if (!user) return

  const typeLabel = TYPE_LABELS[p.type] ?? p.type

  // Email
  if (user.email && user.gmailRefreshToken) {
    const body = `Здравствуйте, ${user.name}!\n\nЗафиксирована новая активность: ${typeLabel}\n\nОткройте CRM для просмотра подробностей.`
    await safeSendEmail(p.managerId, { to: user.email, subject: `Новая активность: ${typeLabel}`, body })
  }

  // Telegram
  if (user.telegramChatId) {
    await sendTelegramMessage(user.telegramChatId, `📋 <b>Активность: ${typeLabel}</b>\n\nЗафиксирована новая активность по вашему клиенту/сделке.`)
  }
}

async function handleClientAssigned(p: ClientPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.managerId } })
  if (!user?.telegramChatId) return

  const phone = p.phone ? `\n📞 ${p.phone}` : ''
  await sendTelegramMessage(
    user.telegramChatId,
    `👤 <b>Новый клиент назначен</b>\n\n<b>${p.firstName} ${p.lastName}</b>${phone}`
  )
}

async function safeSendEmail(
  userId: string,
  opts: { to: string; subject: string; body: string }
): Promise<void> {
  try {
    await sendEmail(userId, opts)
  } catch (err) {
    if (err instanceof GmailNotConnectedError) return
    throw err
  }
}

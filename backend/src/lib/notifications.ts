import prisma from './prisma.js'
import { sendEmail, GmailNotConnectedError } from './gmail.js'

export type NotificationEvent =
  | 'task_assigned'
  | 'task_deadline_approaching'
  | 'deal_status_changed'
  | 'activity_logged'

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
  payload: TaskPayload | DealPayload | ActivityPayload
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
    }
  } catch (err) {
    console.error(`[notifications] ${event} error:`, err)
  }
}

async function handleTaskAssigned(p: TaskPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.assigneeId } })
  if (!user?.email || !user.gmailRefreshToken) return

  const deadlineStr = p.deadline
    ? `Дедлайн: ${new Date(p.deadline).toLocaleDateString('ru-RU')}`
    : 'Дедлайн не указан'

  const body = `Здравствуйте, ${user.name}!\n\nВам назначена новая задача в CRM:\n\nЗадача: ${p.title}\n${deadlineStr}\n\nОткройте CRM для просмотра подробностей.`

  await safeSend(p.assigneeId, {
    to: user.email,
    subject: `Новая задача: ${p.title}`,
    body,
  })
}

async function handleDeadlineApproaching(p: TaskPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.assigneeId } })
  if (!user?.email || !user.gmailRefreshToken) return

  const deadlineStr = p.deadline
    ? new Date(p.deadline).toLocaleDateString('ru-RU')
    : 'завтра'

  const body = `Здравствуйте, ${user.name}!\n\nНапоминаем, что завтра дедлайн задачи:\n\nЗадача: ${p.title}\nДедлайн: ${deadlineStr}\n\nОткройте CRM для просмотра подробностей.`

  await safeSend(p.assigneeId, {
    to: user.email,
    subject: `Дедлайн завтра: ${p.title}`,
    body,
  })
}

async function handleDealStatusChanged(p: DealPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.managerId } })
  if (!user?.email || !user.gmailRefreshToken) return

  const from = STATUS_LABELS[p.fromStatus] ?? p.fromStatus
  const to = STATUS_LABELS[p.toStatus] ?? p.toStatus

  const body = `Здравствуйте, ${user.name}!\n\nСтатус сделки изменился:\n\nСделка: ${p.title}\n${from} → ${to}\n\nОткройте CRM для просмотра подробностей.`

  await safeSend(p.managerId, {
    to: user.email,
    subject: `Сделка изменила статус: ${p.title}`,
    body,
  })
}

async function handleActivityLogged(p: ActivityPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: p.managerId } })
  if (!user?.email || !user.gmailRefreshToken) return

  const typeLabel = TYPE_LABELS[p.type] ?? p.type

  const body = `Здравствуйте, ${user.name}!\n\nЗафиксирована новая активность: ${typeLabel}\n\nОткройте CRM для просмотра подробностей.`

  await safeSend(p.managerId, {
    to: user.email,
    subject: `Новая активность: ${typeLabel}`,
    body,
  })
}

async function safeSend(
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

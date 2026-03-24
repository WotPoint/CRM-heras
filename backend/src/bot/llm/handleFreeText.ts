import { type BotContext } from '../context.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import { parseIntent } from './parseIntent.js'
import { askAssistant } from './askAssistant.js'
import prisma from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { v4 as uuidv4 } from 'uuid'
import { handleTasks } from '../commands/tasks.js'

const TYPE_LABELS: Record<string, string> = {
  call: '📞 Звонок',
  email: '✉️ Email',
  meeting: '🤝 Встреча',
  note: '📝 Заметка',
}

const CONFIDENCE_THRESHOLD = 0.65

/**
 * Пробует распознать свободный текст через LLM и выполнить действие.
 * Возвращает true если действие было выполнено, false — если LLM не смог.
 */
export async function handleFreeText(ctx: BotContext, user: { id: string; name: string; role: string }): Promise<boolean> {
  const text = ctx.message?.text
  if (!text) return false

  const typingMsg = await ctx.reply('🤔 Анализирую...')

  const parsed = await parseIntent(text, user.name, user.role)

  // Удаляем сообщение "Анализирую..." (не критично если не получится)
  await ctx.api.deleteMessage(ctx.chat!.id, typingMsg.message_id).catch(() => undefined)

  if (parsed.confidence < CONFIDENCE_THRESHOLD || parsed.intent === 'unknown') {
    const answer = await askAssistant(text, user)
    if (answer) {
      await ctx.reply(answer, { reply_markup: mainMenuKeyboard() })
      return true
    }
    return false
  }

  if (parsed.intent === 'show_tasks') {
    await handleTasks(ctx)
    return true
  }

  if (parsed.intent === 'log_activity') {
    return await handleLogActivity(ctx, user, parsed.entities)
  }

  if (parsed.intent === 'create_task') {
    return await handleCreateTask(ctx, user, parsed.entities)
  }

  if (parsed.intent === 'quick_note') {
    await ctx.conversation.enter('quickNote')
    return true
  }

  return false
}

async function handleLogActivity(
  ctx: BotContext,
  user: { id: string; name: string; role: string },
  entities: Awaited<ReturnType<typeof parseIntent>>['entities'],
): Promise<boolean> {
  const { clientFirstName, clientLastName, clientPhone, activityType, activityDate, description, result } = entities

  // Найти или создать клиента
  let clientId: string | null = null
  let clientDisplayName = ''
  let isNewClient = false

  if (clientLastName) {
    const existing = await findClient(clientLastName, clientFirstName, user)

    if (existing) {
      clientId = existing.id
      clientDisplayName = `${existing.firstName} ${existing.lastName}`.trim()
    } else {
      // Создаём нового клиента
      const newClient = await prisma.client.create({
        data: {
          id: uuidv4(),
          firstName: clientFirstName ?? '',
          lastName: clientLastName,
          phone: clientPhone ?? null,
          status: 'lead',
          managerId: user.id,
          tags: '[]',
          createdAt: new Date().toISOString(),
        },
      })
      clientId = newClient.id
      clientDisplayName = `${clientFirstName ?? ''} ${clientLastName}`.trim()
      isNewClient = true
      logger.info('client.created_via_llm', { clientId, userId: user.id })
    }
  }

  // Создаём активность
  const actDate = activityDate ? new Date(activityDate) : new Date()
  const type = activityType ?? 'note'

  const activity = await prisma.activity.create({
    data: {
      id: uuidv4(),
      type,
      managerId: user.id,
      clientId: clientId ?? null,
      date: actDate.toISOString(),
      description: description ?? text(ctx),
      result: result ?? null,
      createdAt: new Date().toISOString(),
    },
  })

  logger.info('activity.created_via_llm', { activityId: activity.id, userId: user.id, type })

  // Формируем ответ
  const lines: string[] = []
  lines.push(`✅ <b>Активность записана!</b>`)
  lines.push(``)
  lines.push(`${TYPE_LABELS[type] ?? type}`)
  lines.push(`📅 ${actDate.toLocaleDateString('ru-RU')}`)
  if (clientDisplayName) {
    lines.push(`👤 ${clientDisplayName}${isNewClient ? ' <i>(новый клиент)</i>' : ''}`)
  }
  if (description) lines.push(`📝 ${description}`)
  if (result) lines.push(`🎯 ${result}`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(),
  })

  return true
}

async function handleCreateTask(
  ctx: BotContext,
  user: { id: string; name: string; role: string },
  entities: Awaited<ReturnType<typeof parseIntent>>['entities'],
): Promise<boolean> {
  const { clientFirstName, clientLastName, clientPhone, taskTitle, taskDeadline, taskPriority } = entities

  // Найти клиента (не создаём — задача может быть без клиента)
  let clientId: string | null = null
  let clientDisplayName = ''

  if (clientLastName) {
    const existing = await findClient(clientLastName, clientFirstName, user)
    if (existing) {
      clientId = existing.id
      clientDisplayName = `${existing.firstName} ${existing.lastName}`.trim()
    } else if (clientPhone || clientFirstName) {
      // Создаём нового клиента только если есть хоть какие-то данные помимо фамилии
      const newClient = await prisma.client.create({
        data: {
          id: uuidv4(),
          firstName: clientFirstName ?? '',
          lastName: clientLastName,
          phone: clientPhone ?? null,
          status: 'lead',
          managerId: user.id,
          tags: '[]',
          createdAt: new Date().toISOString(),
        },
      })
      clientId = newClient.id
      clientDisplayName = `${clientFirstName ?? ''} ${clientLastName}`.trim()
      logger.info('client.created_via_llm', { clientId, userId: user.id })
    }
  }

  const title = taskTitle ?? (ctx.message?.text ?? 'Задача')
  const priority = taskPriority ?? 'medium'
  const deadline = taskDeadline ? new Date(taskDeadline) : null

  const task = await prisma.task.create({
    data: {
      id: uuidv4(),
      title,
      priority,
      status: 'new',
      assigneeId: user.id,
      clientId: clientId ?? null,
      deadline: deadline ? deadline.toISOString() : null,
      createdAt: new Date().toISOString(),
    },
  })

  logger.info('task.created_via_llm', { taskId: task.id, userId: user.id })

  const PRIORITY_LABELS: Record<string, string> = { high: '🔴 Высокий', medium: '🟡 Средний', low: '🟢 Низкий' }

  const lines: string[] = []
  lines.push('✅ <b>Задача создана!</b>')
  lines.push('')
  lines.push(`📌 ${title}`)
  lines.push(`${PRIORITY_LABELS[priority]}`)
  if (deadline) lines.push(`📅 ${deadline.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: deadline.getHours() ? 'short' : undefined })}`)
  if (clientDisplayName) lines.push(`👤 ${clientDisplayName}`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(),
  })

  return true
}

async function findClient(lastName: string, firstName: string | null, user: { id: string; role: string }) {
  return prisma.client.findFirst({
    where: {
      OR: [
        firstName
          ? { firstName: { contains: firstName }, lastName: { contains: lastName } }
          : { lastName: { contains: lastName } },
        { lastName: { contains: lastName } },
      ],
      ...(user.role === 'manager' ? { managerId: user.id } : {}),
    },
  })
}

function text(ctx: BotContext): string {
  return ctx.message?.text ?? ''
}

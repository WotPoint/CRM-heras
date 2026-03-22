import { type BotContext } from '../context.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import { parseIntent } from './parseIntent.js'
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
    await ctx.reply(
      '📌 Похоже, вы хотите создать задачу. Используйте пошаговый сценарий:',
      { reply_markup: mainMenuKeyboard() },
    )
    await ctx.conversation.enter('createTask')
    return true
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
    const existing = await prisma.client.findFirst({
      where: {
        OR: [
          clientFirstName
            ? { firstName: { contains: clientFirstName }, lastName: { contains: clientLastName } }
            : { lastName: { contains: clientLastName } },
          { lastName: { contains: clientLastName } },
        ],
        ...(user.role === 'manager' ? { managerId: user.id } : {}),
      },
    })

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

function text(ctx: BotContext): string {
  return ctx.message?.text ?? ''
}

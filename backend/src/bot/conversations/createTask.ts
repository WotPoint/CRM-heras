import { type Conversation } from '@grammyjs/conversations'
import { type BotContext } from '../context.js'
import { priorityKeyboard } from '../keyboards/priority.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

const PRIORITY_LABELS: Record<string, string> = { low: '🟢 Низкий', medium: '🟡 Средний', high: '🔴 Высокий' }

function parseDate(text: string): Date | null {
  const clean = text.trim()
  // дд.мм.гггг или дд.мм
  const m = clean.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/)
  if (!m) return null
  const day = parseInt(m[1])
  const month = parseInt(m[2]) - 1
  const year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
  const d = new Date(year, month, day, 18, 0, 0)
  return isNaN(d.getTime()) ? null : d
}

export async function createTaskConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await conversation.external(() =>
    prisma.user.findFirst({ where: { telegramChatId: chatId } })
  )
  if (!user) return

  // Шаг 1: Название
  await ctx.reply('📝 <b>Новая задача</b>\n\nВведите название задачи (или /отмена):', { parse_mode: 'HTML' })
  const titleCtx = await conversation.wait()
  if (titleCtx.message?.text?.startsWith('/')) { await titleCtx.reply('Отменено.'); return }
  const title = titleCtx.message?.text?.trim() ?? ''
  if (!title) { await titleCtx.reply('Отменено.'); return }

  // Шаг 2: Приоритет
  await titleCtx.reply('Выберите приоритет:', { reply_markup: priorityKeyboard() })
  const priCtx = await conversation.waitForCallbackQuery(/^priority:/)
  await priCtx.answerCallbackQuery()
  const priority = priCtx.callbackQuery.data.split(':')[1]

  // Шаг 3: Дедлайн
  await priCtx.reply('Укажите дедлайн (дд.мм или дд.мм.гггг) или нажмите «Пропустить»:', {
    reply_markup: { inline_keyboard: [[{ text: '⏭ Пропустить', callback_data: 'deadline:skip' }]] },
  })
  let deadline: string | null = null
  const dlCtx = await conversation.wait()
  if (dlCtx.callbackQuery?.data === 'deadline:skip') {
    await dlCtx.answerCallbackQuery()
  } else if (dlCtx.message?.text) {
    const parsed = parseDate(dlCtx.message.text)
    if (parsed) {
      deadline = parsed.toISOString()
      await dlCtx.reply(`📅 Дедлайн: ${parsed.toLocaleDateString('ru-RU')}`)
    } else {
      await dlCtx.reply('Не понял формат. Дедлайн не установлен.')
    }
  }

  // Шаг 4: Клиент
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  const lastCtx = dlCtx.callbackQuery ? dlCtx : dlCtx
  await ctx.reply('Привязать к клиенту?', { reply_markup: clientKb })
  const clientCtx = await conversation.wait()
  let clientId: string | null = null
  if (clientCtx.callbackQuery?.data?.startsWith('client:') && clientCtx.callbackQuery.data !== 'client:skip') {
    clientId = clientCtx.callbackQuery.data.split(':')[1]
    await clientCtx.answerCallbackQuery()
  } else if (clientCtx.callbackQuery?.data === 'client:skip') {
    await clientCtx.answerCallbackQuery()
  }

  // Шаг 5: Подтверждение
  const dlStr = deadline ? new Date(deadline).toLocaleDateString('ru-RU') : 'не указан'
  let clientName = ''
  if (clientId) {
    const c = await conversation.external(() => prisma.client.findUnique({ where: { id: clientId! } }))
    if (c) clientName = `\n👤 Клиент: ${c.firstName} ${c.lastName}`
  }

  await ctx.reply(
    `📌 <b>Подтвердите задачу:</b>\n\n` +
    `<b>${title}</b>\n${PRIORITY_LABELS[priority]}\n📅 Дедлайн: ${dlStr}${clientName}\n\n` +
    `Создать?`,
    {
      parse_mode: 'HTML',
      reply_markup: new (await import('grammy')).InlineKeyboard()
        .text('✅ Создать', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
    },
  )

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/)
  await confirmCtx.answerCallbackQuery()

  if (confirmCtx.callbackQuery.data === 'confirm:no') {
    await confirmCtx.reply('Отменено.')
    return
  }

  const task = await conversation.external(() =>
    prisma.task.create({
      data: {
        id: uuidv4(),
        title,
        priority,
        status: 'new',
        assigneeId: user.id,
        clientId: clientId ?? null,
        deadline: deadline ?? null,
        isArchived: false,
        createdAt: new Date().toISOString(),
      },
    })
  )

  logger.info('task.created_via_telegram', { taskId: task.id, userId: user.id })
  await confirmCtx.reply(`✅ Задача «${title}» создана!`, { reply_markup: mainMenuKeyboard() })
}

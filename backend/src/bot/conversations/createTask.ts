import { type Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'
import { type BotContext } from '../context.js'
import { priorityKeyboard } from '../keyboards/priority.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import { askText, waitCallback } from './helpers.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

const PRIORITY_LABELS: Record<string, string> = { low: '🟢 Низкий', medium: '🟡 Средний', high: '🔴 Высокий' }

function parseDate(text: string): Date | null {
  const clean = text.trim()
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
  await ctx.reply('📝 <b>Новая задача</b>\n\nВведите название задачи:', { parse_mode: 'HTML' })
  const title = await askText(conversation, 'Введите название задачи:')
  if (!title) return

  // Шаг 2: Приоритет
  await ctx.reply('Выберите приоритет:', { reply_markup: priorityKeyboard() })
  const priResult = await waitCallback(conversation, /^priority:/)
  if (!priResult) return
  await priResult.ctx.answerCallbackQuery()
  const priority = priResult.data.split(':')[1]

  // Шаг 3: Дедлайн (с повтором при неверном формате)
  await ctx.reply('Укажите дедлайн (дд.мм или дд.мм.гггг) или нажмите «Пропустить»:', {
    reply_markup: new InlineKeyboard().text('⏭ Пропустить', 'deadline:skip'),
  })
  let deadline: string | null = null
  deadlineLoop: while (true) {
    const dlCtx = await conversation.wait()
    if (dlCtx.message?.text?.startsWith('/')) { await dlCtx.reply('Диалог завершён.'); return }
    if (dlCtx.callbackQuery?.data === 'deadline:skip') {
      await dlCtx.answerCallbackQuery()
      break
    }
    if (dlCtx.message?.text) {
      const parsed = parseDate(dlCtx.message.text)
      if (parsed) {
        deadline = parsed.toISOString()
        await dlCtx.reply(`📅 Дедлайн: ${parsed.toLocaleDateString('ru-RU')}`)
        break deadlineLoop
      }
      await dlCtx.reply('⚠️ Не понял формат. Введите, например: <b>25.03</b> или <b>25.03.2026</b>, либо нажмите «Пропустить».',
        { parse_mode: 'HTML' })
      continue
    }
    await dlCtx.reply('👆 Введите дату или нажмите «Пропустить».')
  }

  // Шаг 4: Клиент (с поиском по имени)
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  await ctx.reply('Привязать к клиенту? Выберите или введите имя для поиска:', { reply_markup: clientKb })
  let clientId: string | null = null
  clientLoop: while (true) {
    const clientCtx = await conversation.wait()
    if (clientCtx.message?.text?.startsWith('/')) { await clientCtx.reply('Диалог завершён.'); return }
    if (clientCtx.callbackQuery?.data === 'client:skip') {
      await clientCtx.answerCallbackQuery()
      break
    }
    if (clientCtx.callbackQuery?.data?.startsWith('client:')) {
      clientId = clientCtx.callbackQuery.data.split(':')[1]
      await clientCtx.answerCallbackQuery()
      break clientLoop
    }
    if (clientCtx.message?.text) {
      const search = clientCtx.message.text.trim()
      const found = await conversation.external(() =>
        prisma.client.findMany({
          where: {
            OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }],
            ...(user.role === 'manager' ? { managerId: user.id } : {}),
          },
          take: 8,
          select: { id: true, firstName: true, lastName: true },
        })
      )
      if (found.length === 0) {
        await clientCtx.reply('Клиенты не найдены. Попробуйте снова или выберите из списка:', { reply_markup: clientKb })
      } else {
        const kb = new InlineKeyboard()
        for (const c of found) kb.text(`${c.firstName} ${c.lastName}`, `client:${c.id}`).row()
        kb.text('⏭ Пропустить', 'client:skip')
        await clientCtx.reply('Выберите клиента:', { reply_markup: kb })
      }
      continue
    }
    await clientCtx.reply('👆 Нажмите кнопку или введите имя клиента для поиска.')
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
      reply_markup: new InlineKeyboard().text('✅ Создать', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
    },
  )

  const confirmResult = await waitCallback(conversation, /^confirm:/)
  if (!confirmResult) return
  await confirmResult.ctx.answerCallbackQuery()
  if (confirmResult.data === 'confirm:no') { await confirmResult.ctx.reply('Отменено.'); return }

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
  await confirmResult.ctx.reply(`✅ Задача «${title}» создана!`, { reply_markup: mainMenuKeyboard() })
}

import { type Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'
import { type BotContext } from '../context.js'
import { activityTypeKeyboard } from '../keyboards/activityType.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

const TYPE_LABELS: Record<string, string> = {
  call: '📞 Звонок', email: '✉️ Email', meeting: '🤝 Встреча', note: '📝 Заметка',
}

function parseDateTime(text: string): Date | null {
  const clean = text.trim()
  // дд.мм.гггг чч:мм или дд.мм чч:мм
  const m = clean.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const day = parseInt(m[1]), month = parseInt(m[2]) - 1
  const year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
  const hour = parseInt(m[4]), min = parseInt(m[5])
  const d = new Date(year, month, day, hour, min)
  return isNaN(d.getTime()) ? null : d
}

export async function createActivityConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await conversation.external(() =>
    prisma.user.findFirst({ where: { telegramChatId: chatId } })
  )
  if (!user) return

  // Шаг 1: Тип
  await ctx.reply('📅 <b>Новая активность</b>\n\nВыберите тип (или /отмена):', {
    parse_mode: 'HTML',
    reply_markup: activityTypeKeyboard(),
  })
  const typeCtx = await conversation.waitForCallbackQuery(/^atype:/)
  await typeCtx.answerCallbackQuery()
  const type = typeCtx.callbackQuery.data.split(':')[1]

  // Шаг 2: Дата
  await typeCtx.reply('Укажите дату и время (дд.мм чч:мм или дд.мм.гггг чч:мм):')
  let date: Date | null = null
  while (!date) {
    const dateCtx = await conversation.wait()
    if (dateCtx.message?.text?.startsWith('/')) { await dateCtx.reply('Отменено.'); return }
    date = parseDateTime(dateCtx.message?.text ?? '')
    if (!date) await dateCtx.reply('Не понял формат. Введите, например: 25.03 14:00')
  }

  // Шаг 3: Клиент
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  await ctx.reply('Выберите клиента:', { reply_markup: clientKb })
  const clientCtx = await conversation.wait()
  let clientId: string | null = null
  if (clientCtx.callbackQuery?.data?.startsWith('client:') && clientCtx.callbackQuery.data !== 'client:skip') {
    clientId = clientCtx.callbackQuery.data.split(':')[1]
    await clientCtx.answerCallbackQuery()
  } else {
    await clientCtx.answerCallbackQuery?.()
  }

  // Шаг 4: Описание
  await ctx.reply('Опишите активность:')
  const descCtx = await conversation.wait()
  if (descCtx.message?.text?.startsWith('/')) { await descCtx.reply('Отменено.'); return }
  const description = descCtx.message?.text?.trim() ?? ''
  if (!description) { await descCtx.reply('Отменено.'); return }

  // Шаг 5: Результат (опционально)
  await descCtx.reply('Результат (опционально):', {
    reply_markup: new InlineKeyboard().text('⏭ Пропустить', 'result:skip'),
  })
  const resultCtx = await conversation.wait()
  let result: string | null = null
  if (resultCtx.message?.text && !resultCtx.message.text.startsWith('/')) {
    result = resultCtx.message.text.trim()
  }
  await resultCtx.answerCallbackQuery?.()

  // Шаг 6: Подтверждение
  let clientName = ''
  if (clientId) {
    const c = await conversation.external(() => prisma.client.findUnique({ where: { id: clientId! } }))
    if (c) clientName = `\n👤 ${c.firstName} ${c.lastName}`
  }

  await ctx.reply(
    `📋 <b>Подтвердите активность:</b>\n\n` +
    `${TYPE_LABELS[type]}\n📅 ${date.toLocaleString('ru-RU')}${clientName}\n📝 ${description}\n\n` +
    'Создать?',
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Создать', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
    },
  )

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/)
  await confirmCtx.answerCallbackQuery()
  if (confirmCtx.callbackQuery.data === 'confirm:no') { await confirmCtx.reply('Отменено.'); return }

  const activity = await conversation.external(() =>
    prisma.activity.create({
      data: {
        id: uuidv4(),
        type,
        managerId: user.id,
        clientId: clientId ?? null,
        date: date!.toISOString(),
        description,
        result: result ?? null,
        createdAt: new Date().toISOString(),
      },
    })
  )

  logger.info('activity.created_via_telegram', { activityId: activity.id, userId: user.id })
  await confirmCtx.reply(`✅ ${TYPE_LABELS[type]} запланирована!`, { reply_markup: mainMenuKeyboard() })
}

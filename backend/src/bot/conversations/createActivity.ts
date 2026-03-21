import { type Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'
import { type BotContext } from '../context.js'
import { activityTypeKeyboard } from '../keyboards/activityType.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import { askText, waitCallback } from './helpers.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

const TYPE_LABELS: Record<string, string> = {
  call: '📞 Звонок', email: '✉️ Email', meeting: '🤝 Встреча', note: '📝 Заметка',
}

function parseDateTime(text: string): Date | null {
  const clean = text.trim()
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
  await ctx.reply('📅 <b>Новая активность</b>\n\nВыберите тип:', {
    parse_mode: 'HTML',
    reply_markup: activityTypeKeyboard(),
  })
  const typeResult = await waitCallback(conversation, /^atype:/)
  if (!typeResult) return
  await typeResult.ctx.answerCallbackQuery()
  const type = typeResult.data.split(':')[1]

  // Шаг 2: Дата (с повтором при неверном формате)
  await ctx.reply('Укажите дату и время (дд.мм чч:мм или дд.мм.гггг чч:мм):\nПример: <b>25.03 14:00</b>', {
    parse_mode: 'HTML',
  })
  let date: Date | null = null
  while (!date) {
    const dateCtx = await conversation.wait()
    if (dateCtx.message?.text?.startsWith('/')) { await dateCtx.reply('Диалог завершён.'); return }
    if (!dateCtx.message?.text) {
      await dateCtx.reply('⚠️ Пожалуйста, введите дату и время текстом. Пример: <b>25.03 14:00</b>', { parse_mode: 'HTML' })
      continue
    }
    date = parseDateTime(dateCtx.message.text)
    if (!date) await dateCtx.reply('⚠️ Не понял формат. Введите, например: <b>25.03 14:00</b>', { parse_mode: 'HTML' })
  }

  // Шаг 3: Клиент (с поиском по имени)
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  await ctx.reply('Выберите клиента или введите имя для поиска:', { reply_markup: clientKb })
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

  // Шаг 4: Описание
  await ctx.reply('Опишите активность:')
  const description = await askText(conversation, 'Опишите активность:')
  if (!description) return

  // Шаг 5: Результат (опционально)
  await ctx.reply('Результат (опционально):', {
    reply_markup: new InlineKeyboard().text('⏭ Пропустить', 'result:skip'),
  })
  let result: string | null = null
  resultLoop: while (true) {
    const resultCtx = await conversation.wait()
    if (resultCtx.message?.text?.startsWith('/')) { await resultCtx.reply('Диалог завершён.'); return }
    if (resultCtx.callbackQuery?.data === 'result:skip') {
      await resultCtx.answerCallbackQuery()
      break
    }
    if (resultCtx.message?.text) {
      result = resultCtx.message.text.trim()
      break resultLoop
    }
    await resultCtx.reply('👆 Введите текст результата или нажмите «Пропустить».')
  }

  // Шаг 6: Подтверждение
  let clientName = ''
  if (clientId) {
    const c = await conversation.external(() => prisma.client.findUnique({ where: { id: clientId! } }))
    if (c) clientName = `\n👤 ${c.firstName} ${c.lastName}`
  }

  await ctx.reply(
    `📋 <b>Подтвердите активность:</b>\n\n` +
    `${TYPE_LABELS[type]}\n📅 ${date!.toLocaleString('ru-RU')}${clientName}\n📝 ${description}\n\n` +
    'Создать?',
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Создать', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
    },
  )

  const confirmResult = await waitCallback(conversation, /^confirm:/)
  if (!confirmResult) return
  await confirmResult.ctx.answerCallbackQuery()
  if (confirmResult.data === 'confirm:no') { await confirmResult.ctx.reply('Отменено.'); return }

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
  await confirmResult.ctx.reply(`✅ ${TYPE_LABELS[type]} запланирована!`, { reply_markup: mainMenuKeyboard() })
}

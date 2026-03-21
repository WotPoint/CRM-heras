import { type Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'
import { type BotContext } from '../context.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import { askText, waitCallback } from './helpers.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

export async function quickNoteConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await conversation.external(() =>
    prisma.user.findFirst({ where: { telegramChatId: chatId } })
  )
  if (!user) return

  // Шаг 1: Выбор клиента (с поиском по имени)
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  await ctx.reply('📋 <b>Заметка о клиенте</b>\n\nВыберите клиента или введите имя для поиска:', {
    parse_mode: 'HTML',
    reply_markup: clientKb,
  })

  let clientId: string | null = null
  let clientName = ''

  clientLoop: while (!clientId) {
    const clientCtx = await conversation.wait()
    if (clientCtx.message?.text?.startsWith('/')) { await clientCtx.reply('Диалог завершён.'); return }

    if (clientCtx.callbackQuery?.data?.startsWith('client:') && clientCtx.callbackQuery.data !== 'client:skip') {
      clientId = clientCtx.callbackQuery.data.split(':')[1]
      await clientCtx.answerCallbackQuery()
      const c = await conversation.external(() => prisma.client.findUnique({ where: { id: clientId! } }))
      if (c) clientName = `${c.firstName} ${c.lastName}`
      break clientLoop
    }
    if (clientCtx.message?.text) {
      const search = clientCtx.message.text.trim()
      const found = await conversation.external(() =>
        prisma.client.findMany({
          where: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
            ...(user.role === 'manager' ? { managerId: user.id } : {}),
          },
          take: 8,
          select: { id: true, firstName: true, lastName: true },
        })
      )

      if (found.length === 0) {
        await clientCtx.reply('Клиенты не найдены. Попробуйте снова или выберите из списка:',
          { reply_markup: clientKb })
      } else {
        const kb = new InlineKeyboard()
        for (const c of found) kb.text(`${c.firstName} ${c.lastName}`, `client:${c.id}`).row()
        await clientCtx.reply('Выберите клиента:', { reply_markup: kb })
      }
      continue
    }
    await clientCtx.reply('👆 Нажмите кнопку или введите имя клиента для поиска.')
  }

  // Шаг 2: Текст заметки
  await ctx.reply(`Введите текст заметки о клиенте <b>${clientName}</b>:`, { parse_mode: 'HTML' })
  const text = await askText(conversation, 'Введите текст заметки:', { maxLength: 1000 })
  if (!text) return

  // Шаг 3: Подтверждение
  const preview = text.length > 100 ? text.slice(0, 100) + '...' : text
  await ctx.reply(
    `📝 <b>Сохранить заметку?</b>\n\n👤 ${clientName}\n\n${preview}`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Сохранить', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
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
        type: 'note',
        managerId: user.id,
        clientId,
        date: new Date().toISOString(),
        description: text,
        createdAt: new Date().toISOString(),
      },
    })
  )

  logger.info('note.created_via_telegram', { activityId: activity.id, userId: user.id, clientId })
  await confirmResult.ctx.reply('✅ Заметка сохранена!', { reply_markup: mainMenuKeyboard() })
}
